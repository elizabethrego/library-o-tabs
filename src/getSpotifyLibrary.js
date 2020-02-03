'use strict'

const https = require('https')

const processEvent = (eventToProcess) => {
	if (eventToProcess.queryStringParameters) {
		let params = eventToProcess.queryStringParameters
		if (params.spotify_access_token) {
			return params.spotify_access_token
		} else return false
	} else return false
}

const buildLibrary = (spotify_access_token) => {
	return new Promise((resolve, reject) => {
		if (spotify_access_token) {
			let libraryBuilder = new LibraryBuilder(spotify_access_token)
			libraryBuilder.getTracksFromSpotify()
			.then( (library) => resolve(library) )
			.catch( (error) => reject(error) )
		} else return reject('STRING_SPOTIFY_CONNECTION_ERROR')
	}) 
}

const doGetRequest = (url, options) => {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      console.log(`status code: ${res.statusCode}`)
      // console.log(`header: ${res.headers['retry-after']}`)
      
      
      if (res.statusCode == '429') {
      	setTimeout(function() {
      		doGetRequest(url, options)
      	}, res.headers['retry-after'] * 1000)
      } 
      
      res.setEncoding('utf8')

      let responseData = ''

      res.on('data', (d) => responseData += d )

      res.on('end', (e) => {
        let potentialError = JSON.parse(responseData).error

        if (potentialError) reject(potentialError.message)
        else resolve(responseData)
      })

      res.on('error', (e) => reject(e) )
    })
  })
} 

class LibraryBuilder {
	constructor(token = '') {
	    this.httpOptions = {
	        headers: {
	          'Authorization': `Bearer ${token}` 
	    	}
		}

		this.library = {}
		
		this.limit = 50

		this.tracksEndpoint = process.env.SPOTIFY_TRACKS_ENDPOINT
	}

	isArtistInLibrary(artistId) {
		let artist = this.library[artistId]
		return artist? artist.name : false
	}

	addArtistToLibrary(artistId, artistName) {
		if (!this.isArtistInLibrary(artistId)) {
			this.library[artistId] = {
				name: artistName,
				songs: []
			}
			
			return true;
		} else return false;
	}

	addSongToLibrary(artistId, artistName, song) {
		this.addArtistToLibrary(artistId, artistName)
		this.library[artistId].songs.push(song)
	}

	getRequestQueryString(offset) {
		return `?limit=${this.limit}&offset=${offset}`
	}

	getTracksFromSpotify() {
		return new Promise((resolve, reject) => {
			this.getPageOfTracksFromSpotify(0)
			.then( (numTracks) => this.createTrackRequests(numTracks) )
			.then( (allTrackRequests) => Promise.all(allTrackRequests)) 
			.then( () => {
				console.log(`Library: ${JSON.stringify(this.library)}`) 
				return resolve(this.library)
			})
			.catch( (error) => reject(error) )
		})
	}

	getPageOfTracksFromSpotify(offset) {
		return new Promise((resolve, reject) => {
			doGetRequest(this.tracksEndpoint + this.getRequestQueryString(offset), this.httpOptions)
		    .then( (page) => this.processPage(page) )
		    .then( (numTracks) => resolve(numTracks) ) 
		    .catch( (error) => reject(error) )
		})
	}
	
	createTrackRequests(numTracks) {
			let trackRequests = []
			
			for(let i = this.limit; i < numTracks; i += this.limit) {
				trackRequests.push(new Promise((resolve, reject) => resolve(this.getPageOfTracksFromSpotify(i)) ))
			}

			return trackRequests
	} 

	processPage(pageToProcess) {
		return new Promise((resolve, reject) => {
			let page = JSON.parse(pageToProcess)
			
			if (page.items) {
				for (let i = 0; i < page.items.length; i++) { 
					 this.addSongToLibrary(page.items[i].track.artists[0].id, page.items[i].track.artists[0].name, {
						name: page.items[i].track.name,
						url: page.items[i].track.external_urls.spotify
					}) 
				}
				
				return resolve(page.total)
			} else reject('STRING_LIBRARY_READ_ERROR')
		})
	}
}


module.exports.handler = (event, context, callback) => {
	let processedEvent = processEvent(event)

	buildLibrary(processedEvent)
	.then( (library) => callback(null, library) )
	.catch( (error) => callback(error) )
}
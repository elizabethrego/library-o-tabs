'use strict'

const processEvent = (eventToProcess) => {
	/* if (eventToProcess.queryStringParameters) {
		let params = eventToProcess.queryStringParameters
		if (params.redirected_url) {
			return params.redirected_url
		} else return false
	} else return false */
	return true
}

const doSomething = (something) => {
	return new Promise((resolve, reject) => {
		/* if (redirectedURL) {
			let startIndex = redirectedURL.indexOf(accessTokenProperty) 
			let stopIndex = redirectedURL.indexOf('&token_type=')

			if (startIndex > 0 && stopIndex > 0) {
				resolve(redirectedURL.substring(startIndex + accessTokenProperty.length, stopIndex))
			}
		} else reject('STRING_SPOTIFY_CONNECTION_ERROR') */
		resolve('findTabsForLibrary.js')
	}) 
}

module.exports.handler = (event, context, callback) => {
	let processedEvent = processEvent(event)

	doSomething(processedEvent)
	.then( (something) => callback(null, something) )
	.catch( (error) => callback(error) )
}
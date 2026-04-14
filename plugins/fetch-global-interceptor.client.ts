

class FetchError extends Error {
	status: number;
 
	override toString(): string {
	   return this.message
	}
 
	constructor(message: string, status: number) {
	   super(message);
	   this.status = status;
	}
}
 
export default defineNuxtPlugin((app) => {
	const fetcher = $fetch.create({
		onRequestError () {
			throw new FetchError('Network Error', 0);
		},
		onResponse: ({ response }) => {
			// Auto refresh page when the server returns a "Session is invalid" error message
			// refreshing the page would automatically send the user to the login page
			if(response.status === 401 && response?._data?.message?.includes("Session is invalid")) reloadNuxtApp()
		},
		onResponseError ({ error, request, response }) {
			let message = response._data?.message || response.statusText 
			const status = response.status;
			throw new FetchError(message, status);
		},
	});

	globalThis.$fetch = fetcher;

});
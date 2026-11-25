// Shared Google Identity Services script loader.

let googleScriptPromise

export function loadGoogle() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google)
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true

      script.onload = () => resolve(window.google)

      script.onerror = () => {
        googleScriptPromise = undefined
        script.remove()
        reject(new Error('Unable to load Google Sign-In.'))
      }

      document.head.appendChild(script)
    })
  }

  return googleScriptPromise
}

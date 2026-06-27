import { defaultUserAgent, refererMap } from './config'

const notionImagePrefix = 'https://www.notion.so/image/'

/**
 * @param {*} event
 * @param {*} request
 */
export async function resolveRequest(event, request) {
  const requestUrl = new URL(request.url)
  let originUri = decodeURIComponent(requestUrl.pathname.slice(1))

  // special-case optimization for notion images coming from unsplash
  if (originUri.startsWith(notionImagePrefix)) {
    const imageUri = decodeURIComponent(
      originUri.slice(notionImagePrefix.length)
    )
    const imageUrl = new URL(imageUri)

    // adjust unsplash defaults to have a max width and intelligent format conversion
    if (imageUrl.hostname === 'images.unsplash.com') {
      const { searchParams } = imageUrl

      if (!searchParams.has('w') && !searchParams.has('fit')) {
        imageUrl.searchParams.set('w', 1920)
        imageUrl.searchParams.set('fit', 'max')
      }

      if (!searchParams.has('auto')) {
        imageUrl.searchParams.set('auto', 'format')
      }

      originUri = `${notionImagePrefix}${encodeURIComponent(
        imageUrl.toString()
      )}`
    }
  }

  const originReq = new Request(originUri, request)

  // Add custom headers only for valid URLs
  let modifiedReq = originReq
  try {
    const originUrl = new URL(originUri)
    const headers = new Headers(originReq.headers)

    // Set User-Agent if not present
    if (!headers.has('user-agent')) {
      headers.set('user-agent', defaultUserAgent)
    }

    // Set Referer based on hostname
    const referer = refererMap[originUrl.hostname]
    if (referer && !headers.has('referer')) {
      headers.set('referer', referer)
    }

    modifiedReq = new Request(originReq, { headers })
  } catch (e) {
    // If URL parsing fails, use original request
  }

  return { originReq: modifiedReq }
}

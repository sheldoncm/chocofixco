export function money(value) {
  return 'S$' + Number(value || 0).toFixed(2)
}

export function fulfilment(value) {
  return value === 'Delivery' ? 'Home Delivery' : 'Self Collection'
}

export function apiError(error) {
  const data = error.response?.data
  if (typeof data === 'string' && !data.trim().startsWith('<')) {
    return data
  }
  return data?.error || 'Unable to complete the request. Please try again.'
}

export function singaporeToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

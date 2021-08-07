export const normalize = (value: number, min: number, max: number) => {
  if (value >= max) {
    return max
  }

  if (value <= min) {
    return min
  }

  return value
}

export const sleep = (delay: number) => new Promise(res => {
  setTimeout(res, delay)
})

import { performance } from 'perf_hooks'

export const throttle = (fn, delay = 1000) => {
  let shouldWait = false
  let waitingArgs
  const timeoutFunc = () => {
    if (waitingArgs == null) {
      shouldWait = false
    } else {
      fn(...waitingArgs)
      waitingArgs = null
      setTimeout(timeoutFunc, delay)
    }
  }

  return (...args) => {
    if (shouldWait) {
      waitingArgs = args
      return
    }

    fn(...args)
    shouldWait = true
    setTimeout(timeoutFunc, delay)
  }
}

export const perf = (fn, name) => {
  const start = performance.now()
  fn()
  const end = performance.now()
  const ms = end - start
  console.log(`${name || 'Function call'}: ${ms}ms`)
}

export const heartbeat = (fn, delay = 1000) => {
  const running = fn()
  if (running === true) {
    setTimeout(() => {
      heartbeat(fn, delay)
    }, delay)
  }
}

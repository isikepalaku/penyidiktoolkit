export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
} 
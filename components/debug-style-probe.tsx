'use client'

import { useEffect } from 'react'

const LOG_ENDPOINT = 'http://127.0.0.1:7252/ingest/dfa93302-39a4-440c-87d8-1ed057028eeb'

function log(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId,
    }),
  }).catch(() => {})
}

export function DebugStyleProbe() {
  useEffect(() => {
    // #region agent log
    const root = document.documentElement
    const body = document.body
    const main = document.querySelector('main')
    const rootStyle = getComputedStyle(root)
    const bodyStyle = getComputedStyle(body)

    const varBackground = rootStyle.getPropertyValue('--color-background').trim()
    const varText = rootStyle.getPropertyValue('--color-text').trim()
    const bodyBg = bodyStyle.backgroundColor
    const bodyColor = bodyStyle.color
    const bodyClasses = body.className || '(none)'

    log(
      'debug-style-probe.tsx:effect',
      'Computed styles and CSS vars',
      {
        varBackground,
        varText,
        bodyBg,
        bodyColor,
        bodyClasses,
        mainExists: !!main,
        mainBg: main ? getComputedStyle(main).backgroundColor : null,
        mainColor: main ? getComputedStyle(main).color : null,
      },
      'H4'
    )
    log(
      'debug-style-probe.tsx:effect',
      'Body computed background and color',
      { bodyBg, bodyColor },
      'H5'
    )
    log(
      'debug-style-probe.tsx:effect',
      'Theme var resolution',
      {
        varBackgroundEmpty: !varBackground,
        varTextEmpty: !varText,
      },
      'H1'
    )
    // #endregion
  }, [])
  return null
}

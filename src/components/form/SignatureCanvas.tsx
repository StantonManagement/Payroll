'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { FormButton } from './index'

interface Point {
  x: number
  y: number
}

interface Props {
  onCapture: (dataUrl: string) => void
  onClear: () => void
  height?: number
}

export function SignatureCanvas({ onCapture, onClear, height = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasMark, setHasMark] = useState(false)
  const lastPoint = useRef<Point | null>(null)

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPoint.current = pos
    setDrawing(true)
    setHasMark(true)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!drawing) return
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    if (lastPoint.current) {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPoint.current = pos
  }, [drawing])

  const endDraw = useCallback(() => {
    if (!drawing) return
    setDrawing(false)
    lastPoint.current = null
    const canvas = canvasRef.current
    if (canvas && hasMark) {
      onCapture(canvas.toDataURL('image/png'))
    }
  }, [drawing, hasMark, onCapture])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    setHasMark(false)
    onClear()
  }, [onClear])

  return (
    <div>
      <div
        className="relative border border-[var(--border)] bg-white touch-none select-none"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={height * 2}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasMark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-[var(--muted)] italic">Sign here</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-[var(--muted)]">Draw your signature above</p>
        <FormButton variant="ghost" size="sm" onClick={clear} type="button">
          Clear
        </FormButton>
      </div>
    </div>
  )
}

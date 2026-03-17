'use client'

import * as React from 'react'
import { Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

export type ChartConfig = Record<
  string,
  { label?: string; color?: string } & Record<string, unknown>
>

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  return ctx ?? { config: {} }
}

export interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig
  children: React.ReactNode
}

export function ChartContainer({
  config,
  className,
  style,
  children,
  ...props
}: ChartContainerProps) {
  const styleWithVars = React.useMemo(() => {
    const vars: Record<string, string> = {}
    for (const [key, entry] of Object.entries(config)) {
      if (entry?.color) vars[`--color-${key}`] = entry.color
    }
    return { ...style, ...vars } as React.CSSProperties
  }, [config, style])

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn('w-full', className)} style={styleWithVars} {...props}>
        {children}
      </div>
    </ChartContext.Provider>
  )
}

export interface ChartTooltipContentProps {
  className?: string
  labelFormatter?: (label: string, payload: unknown[]) => React.ReactNode
  formatter?: (value: number, name: string) => React.ReactNode
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
}

function ChartTooltipContentComponent(
  props: Partial<{
    active: boolean
    payload: Array<{
      name?: string
      value?: number
      dataKey?: string
      color?: string
      payload?: Record<string, unknown>
    }>
    label?: string
  }> & ChartTooltipContentProps
) {
  const {
    active,
    payload = [],
    label,
    className,
    labelFormatter,
    formatter,
    hideLabel,
    hideIndicator,
    indicator = 'dot',
  } = props
  const { config } = useChart()

  if (!active || !payload?.length) return null

  const displayLabel =
    label != null && labelFormatter ? labelFormatter(String(label), payload) : label

  return (
    <div
      className={cn(
        'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className
      )}
    >
      {!hideLabel && displayLabel != null && (
        <div className="font-medium">{displayLabel}</div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const dataKey = item.dataKey ?? item.name
          const name =
            typeof dataKey === 'string'
              ? (config[dataKey]?.label ?? item.name ?? dataKey)
              : String(item.name ?? dataKey)
          const value = item.value
          const color =
            item.color ??
            (typeof dataKey === 'string' ? config[dataKey]?.color : undefined)
          const displayValue =
            formatter && value != null
              ? formatter(value, name)
              : value != null
                ? value.toLocaleString()
                : '—'

          return (
            <div
              key={index}
              className={cn(
                'flex w-full items-center gap-2',
                indicator === 'dot' && 'items-center'
              )}
            >
              {!hideIndicator && (
                <div
                  className={cn(
                    'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                    indicator === 'dot' && 'h-2.5 w-2.5',
                    indicator === 'line' && 'w-1',
                    indicator === 'dashed' &&
                      'w-0 border-[1.5px] border-dashed bg-transparent my-0.5'
                  )}
                  style={
                    {
                      '--color-bg': color,
                      '--color-border': color,
                    } as React.CSSProperties
                  }
                />
              )}
              <div className="flex flex-1 justify-between leading-none items-center">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {displayValue}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartTooltipContent(
  props: ChartTooltipContentProps &
    Partial<{
      active: boolean
      payload: Array<{
        name?: string
        value?: number
        dataKey?: string
        color?: string
        payload?: Record<string, unknown>
      }>
      label?: string
    }>
) {
  return <ChartTooltipContentComponent {...props} />
}

export interface ChartTooltipProps {
  content: React.ReactElement
  cursor?: boolean
}

export function ChartTooltip({ content, cursor = true }: ChartTooltipProps) {
  return (
    <Tooltip
      content={content as React.ComponentProps<typeof Tooltip>['content']}
      cursor={cursor}
    />
  )
}

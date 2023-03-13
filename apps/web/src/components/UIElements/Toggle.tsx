import { Switch } from '@headlessui/react'
import clsx from 'clsx'
import type { Dispatch, FC } from 'react'
import React from 'react'

interface ToggleProps {
  enabled: boolean
  setEnabled: Dispatch<boolean>
  label?: string
}

export const Toggle: FC<ToggleProps> = ({ enabled, setEnabled, label }) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={enabled}
        onChange={() => setEnabled(!enabled)}
        className={clsx(
          enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700',
          'inline-flex h-[22px] w-[42.5px] flex-none cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none'
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            enabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out'
          )}
        />
      </Switch>
      <span className="text-sm">{label}</span>
    </div>
  )
}

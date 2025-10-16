'use client'

import { useBasicProgram } from './basic-data-access'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function BasicCreate() {
  return (
    <div className="text-center space-y-4">
      <p className="text-muted-foreground">
        This section is deprecated. Please use the Deals section to interact with the program.
      </p>
      <Link href="/deals">
        <Button>Go to Deals</Button>
      </Link>
    </div>
  )
}

export function BasicProgram() {
  const { getProgramAccount } = useBasicProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      <pre>{JSON.stringify(getProgramAccount.data.value, null, 2)}</pre>
    </div>
  )
}

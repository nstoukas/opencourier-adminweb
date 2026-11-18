import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ApiKeyShownOnce } from './ApiKeyShownOnce'

// Spec 0037 (AC-13): ApiKeyShownOnce panel
describe('ApiKeyShownOnce (spec 0037, AC-13)', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

  function setClipboard(value: unknown) {
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true })
  }

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard)
    } else {
      delete (navigator as any).clipboard
    }
  })

  it('renders read-only key input and selects content on focus', () => {
    const selectSpy = jest.fn()
    render(<ApiKeyShownOnce apiKey="ock_test_sample_key_123" onDone={jest.fn()} />)

    const input = screen.getByLabelText('New API key') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('ock_test_sample_key_123')
    expect(input).toHaveAttribute('readOnly')

    input.select = selectSpy
    fireEvent.focus(input)
    expect(selectSpy).toHaveBeenCalledTimes(1)
  })

  it('has role="status" element always present, initially empty', () => {
    render(<ApiKeyShownOnce apiKey="ock_test_sample_key_123" onDone={jest.fn()} />)

    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent('')
  })

  it('shows the sentence explaining the key will not be shown again', () => {
    render(<ApiKeyShownOnce apiKey="ock_test_sample_key_123" onDone={jest.fn()} />)

    expect(
      screen.getByText(/this key will not be shown again\. copy it now and give it to whoever connects the restaurant's system/i)
    ).toBeInTheDocument()
  })

  it('Copy writes the key to clipboard, changes button to "Copied" and announces "Copied." in status', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    render(<ApiKeyShownOnce apiKey="ock_my_api_key_456" onDone={jest.fn()} />)

    const copyBtn = screen.getByRole('button', { name: /^copy$/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(writeText).toHaveBeenCalledWith('ock_my_api_key_456')
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Copied.')
    })
    expect(screen.queryByText('Could not copy. Select the key instead.')).toBeNull()
  })

  it('shows fallback line in status when navigator.clipboard is missing (e.g. insecure page)', async () => {
    setClipboard(undefined)

    render(<ApiKeyShownOnce apiKey="ock_my_api_key_456" onDone={jest.fn()} />)

    const copyBtn = screen.getByRole('button', { name: /^copy$/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      const fallback = screen.getByRole('status')
      expect(fallback).toHaveTextContent('Could not copy. Select the key instead.')
    })
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
  })

  it('shows fallback line in status when navigator.clipboard.writeText throws or rejects', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('Permission denied'))
    setClipboard({ writeText })

    render(<ApiKeyShownOnce apiKey="ock_my_api_key_456" onDone={jest.fn()} />)

    const copyBtn = screen.getByRole('button', { name: /^copy$/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      const fallback = screen.getByRole('status')
      expect(fallback).toHaveTextContent('Could not copy. Select the key instead.')
    })
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
  })

  it('calls onDone when Done button is clicked', () => {
    const onDoneMock = jest.fn()
    render(<ApiKeyShownOnce apiKey="ock_my_api_key_456" onDone={onDoneMock} />)

    const doneBtn = screen.getByRole('button', { name: 'Done' })
    fireEvent.click(doneBtn)

    expect(onDoneMock).toHaveBeenCalledTimes(1)
  })
})

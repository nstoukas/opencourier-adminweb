import usePlacesAutocomplete, { getDetails, Suggestion } from 'use-places-autocomplete'
import React, { useEffect } from 'react'
// useTranslation gives t, which looks a key up in the reader's language.
import { useTranslation } from 'react-i18next'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '../admin-web-components';

interface PlacesAutocompleteProps {
  defaultValue?: string
  setSelected: (details: google.maps.places.PlaceResult | string) => void
}

export const PlacesAutocomplete = ({ defaultValue, setSelected }: PlacesAutocompleteProps) => {
  const { t } = useTranslation()
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete()

  useEffect(() => {
    setValue(defaultValue ?? '')
  }, [defaultValue])

  const handleSelect = async (address: Suggestion) => {
    setValue(address.description, false)
    clearSuggestions()

    const details = await getDetails({ fields: ['address_components', 'geometry.location'], placeId: address.place_id })
    setSelected(details)
  }

  return (
    <Command>
      <CommandInput value={value} onValueChange={setValue} disabled={!ready} placeholder={t('components.placesAutocomplete.placeholder')} />
      <CommandEmpty>{t('components.placesAutocomplete.empty')}</CommandEmpty>
      <CommandList>
        <CommandGroup>
          {status === 'OK' &&
            data.map((item) => (
              <CommandItem key={item.place_id} value={item.description} onSelect={() => handleSelect(item)}>
                {item.description}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

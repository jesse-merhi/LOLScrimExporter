import React, { useEffect } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckIcon, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type resultsType = { label: string; value: string; logoUrl?: string };
export interface SearchSelectCommandProps {
  fetchFn: (searchTerm: string) => Promise<resultsType[]>;
  selected: resultsType[];
  setSelected: React.Dispatch<React.SetStateAction<resultsType[]>>;
  placeholder?: string;
  label?: string;
}

export const SearchSelectCommand: React.FC<SearchSelectCommandProps> = ({
  fetchFn,
  placeholder = 'Type and press Enter...',
  setSelected,
  selected,
  label,
}) => {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState<resultsType[]>([]);
  const requestIdRef = React.useRef(0);

  function toggleItem(item: resultsType) {
    const isAlreadySelected = selected.some((s) => s.value === item.value);
    if (isAlreadySelected) {
      setSelected((prev) => prev.filter((x) => x.value !== item.value));
    } else {
      setSelected((prev) => [...prev, item]);
    }
  }

  async function search(newTerm: string) {
    setSearchTerm(newTerm);
    requestIdRef.current += 1;
    const currentReqId = requestIdRef.current;
    const data = await fetchFn(newTerm);
    if (currentReqId === requestIdRef.current) {
      setResults(data);
    }
  }

  useEffect(() => {
    search('');
  }, []);

  return (
    <div className='w-full space-y-2 col-span-3'>
      {label && <p className='font-medium'>{label}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className='relative w-full h-full text-left !items-start !justify-start flex flex-wrap gap-2'
            onClick={() => setOpen(true)}
          >
            {selected.length > 0 ? (
              <div className='flex flex-wrap gap-2 justify-start items-start'>
                {selected.map((item) => (
                  <Badge
                    key={item.value}
                    className='flex items-center h-6'
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent click from bubbling to Button
                      toggleItem(item);
                    }}
                  >
                    {item.logoUrl && (
                      <img className='h-full mr-2' src={item.logoUrl} />
                    )}
                    {item.label}
                    <XCircle className='ml-1 h-4 w-4 cursor-pointer' />
                  </Badge>
                ))}
              </div>
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        {open && (
          <PopoverContent className='p-0 w-[300px]' align='start'>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={placeholder}
                value={searchTerm}
                onValueChange={(e) => search(e)}
              />
              <CommandList>
                <CommandEmpty>Enter your search query</CommandEmpty>
                {results.length > 0 && (
                  <CommandGroup>
                    {results.map((item) => {
                      const isSelected = selected.some(
                        (s) => s.value === item.value
                      );
                      return (
                        <CommandItem
                          key={item.value}
                          onSelect={() => toggleItem(item)}
                          className='cursor-pointer flex items-center'
                        >
                          <CheckIcon
                            className={cn(
                              'mr-2 h-4 w-4',
                              isSelected ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className='h-6 flex flex-row items-center justify-between '>
                            {item.logoUrl && (
                              <img className='h-full mr-2' src={item.logoUrl} />
                            )}
                            <div>{item.label}</div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};

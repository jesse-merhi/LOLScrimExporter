'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerWithRangeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Called when the date range changes.
   * Receives the new date range or `undefined` if no range is selected.
   */
  onChange?: (dateRange: DateRange | undefined) => void;

  /**
   * The initial date range to be selected in the date picker.
   */
  initialDateRange?: DateRange;

  /**
   * Additional class names to apply to the wrapper `div` element.
   */
  className?: string;
}

export function DatePickerWithRange({
  className,
  onChange,
  initialDateRange,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    initialDateRange
  );

  // Handle date change
  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (onChange) {
      onChange(newDate);
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id='date'
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            initialFocus
            mode='range'
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

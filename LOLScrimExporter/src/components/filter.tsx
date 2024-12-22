import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MultiSelect } from './ui/multi-select';
import { DatePickerWithRange } from './ui/daterange';
import { Checkbox } from './ui/checkbox';

function Filter() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='h-[10%] w-full text-xl flex items-center justify-center border-t-2 border-foreground bg-foreground hover:bg-gray-900 '>
          Filters
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Filters</DialogTitle>
          <DialogDescription>
            Filter out games based on different criteria. Make sure to save them
            when you are done.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          {/* // - Per TEAM
// - Losses? Wins?
// - Champions
// - Filter based on bans?
// - Start Date, end date
// - ASC DESC */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='datepicker' className='text-right'>
              Date Range
            </Label>
            <DatePickerWithRange id={'datepicker'} />
          </div>
          <div className='grid grid-cols-4  gap-4 items-center'>
            <Label htmlFor='wins' className='text-right'>
              Wins
            </Label>
            <Checkbox id='wins' checked={true} className='col-span-3' />

            <Label htmlFor='losses' className='text-right'>
              Losses
            </Label>
            <Checkbox id='losses' checked={true} className='col-span-3' />
          </div>

          <div className='grid grid-cols-4 items-center gap-4 w-full'>
            <Label htmlFor='champsPICK' className='text-right'>
              Champions Picked
            </Label>
            <MultiSelect
              placeholder='Champions that have been picked'
              id={'champsPICK'}
              className='w-[300px]'
              options={[
                { label: 'Ezreal', value: 'Ezreal' },
                { label: "Kai'Sa", value: "Kai'Sa" },
                { label: "K'Sante", value: "K'Sante" },
                { label: 'Ornn', value: 'Ornn' },
              ]}
              onValueChange={function (value: string[]): void {
                throw new Error('Function not implemented.');
              }}
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4 w-full'>
            <Label htmlFor='champsBAN' className='text-right'>
              Champions Banned
            </Label>
            <MultiSelect
              placeholder='Champions that have been banned'
              className='w-[300px]'
              id={'champsBAN'}
              options={[
                { label: 'Nami', value: 'Nami' },
                { label: 'Karthus', value: 'Karthus' },
                { label: 'Renekton', value: 'Renekton' },
                { label: 'Syndra', value: 'Syndra' },
              ]}
              onValueChange={function (value: string[]): void {
                throw new Error('Function not implemented.');
              }}
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4 w-full'>
            <Label htmlFor='teams' className='text-right'>
              Teams
            </Label>
            <MultiSelect
              id={'teams'}
              placeholder='Teams that played'
              className='w-[300px]'
              options={[
                { label: 'Bliss', value: 'Bliss' },
                { label: 'Chiefs', value: 'Chiefs' },
                { label: 'Legacy', value: 'Legacy' },
                { label: 'Kanga', value: 'Kanga' },
              ]}
              onValueChange={function (value: string[]): void {
                throw new Error('Function not implemented.');
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type='submit'>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Filter;

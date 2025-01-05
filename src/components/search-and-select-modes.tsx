import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CheckIcon, XCircle } from "lucide-react";
import React, { useEffect } from "react";

export type resultsType = { label: string; value: string; logoUrl?: string };
export interface SearchSelectCommandModesProps {
  fetchFn: (searchTerm: string) => Promise<resultsType[]>;
  selected: resultsType[];
  selectMode: "Any" | "Only";
  setSelectMode: React.Dispatch<React.SetStateAction<"Any" | "Only">>;
  setSelected: React.Dispatch<React.SetStateAction<resultsType[]>>;
  placeholder?: string;
  label?: string;
}

export const SearchSelectCommandModes: React.FC<
  SearchSelectCommandModesProps
> = ({
  fetchFn,
  placeholder = "Type and press Enter...",
  selectMode,
  setSelectMode,
  setSelected,
  selected,
  label,
}) => {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
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
    search("");
  }, []);

  return (
    <div className="w-full space-y-2 col-span-3">
      {label && <p className="font-medium">{label}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="relative w-full h-full text-left !items-start !justify-start flex flex-col gap-0 p-0 rounded-md overflow-hidden"
            onClick={() => setOpen(true)}
          >
            {selected.length > 0 ? (
              <>
                <div className="flex w-full border-b border-slate">
                  <div
                    className={cn(
                      "flex-1 text-center py-2 text-sm font-medium cursor-pointer rounded-tl-md",
                      selectMode === "Any"
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectMode("Any");
                    }}
                  >
                    Any
                  </div>
                  <div
                    className={cn(
                      "flex-1 text-center py-2 text-sm font-medium cursor-pointer rounded-tr-md ",
                      selectMode === "Only"
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectMode("Only");
                    }}
                  >
                    Only
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2 justify-start items-center">
                    {selected.map((item, index) => (
                      <React.Fragment key={item.value}>
                        <Badge
                          className="flex items-center h-6"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent click from bubbling to Button
                            toggleItem(item);
                          }}
                        >
                          {item.logoUrl && (
                            <img className="h-full mr-2" src={item.logoUrl} />
                          )}
                          {item.label}
                          <XCircle className="ml-1 h-4 w-4 cursor-pointer" />
                        </Badge>
                        {index < selected.length - 1 && (
                          <span className="text-xs font-medium px-2 self-center">
                            {selectMode === "Any" ? "or" : "and"}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="px-4 py-2">{placeholder}</div>
            )}

            {/* Badges Section */}
          </Button>
        </PopoverTrigger>
        {open && (
          <PopoverContent className="p-0 w-[300px]" align="start">
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
                          className="cursor-pointer flex items-center"
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="h-6 flex flex-row items-center justify-between ">
                            {item.logoUrl && (
                              <img className="h-full mr-2" src={item.logoUrl} />
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

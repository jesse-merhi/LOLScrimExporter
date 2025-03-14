import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { resultsType, SearchSelectCommand } from "./search-and-select";
import { Button } from "./ui/button";
import { DatePickerWithRange } from "./ui/daterange";

import { invoke } from "@tauri-apps/api/core";
import { SearchSelectCommandModes } from "./search-and-select-modes";
import { Combobox } from "./ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";

interface FilterConfig {
  dateRange: DateRange;
  wins: boolean;
  losses: boolean;
  patch: string;
  championsPicked: resultsType[]; // store champion IDs
  champPickedMode: "Any" | "Only";
  championsBanned: resultsType[];
  champBannedMode: "Any" | "Only";
  teams: resultsType[];
  players: resultsType[];
}

// Each champion in DDragon data
interface ChampionRaw {
  key: string;
  name: string;
  image: {
    full: string;
  };
}

function Filter() {
  let d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: d,
    to: new Date(),
  });
  const [wins, setWins] = useState(true);
  const [losses, setLosses] = useState(true);
  const [patch, setPatch] = useState<string>("");
  const [players, setPlayers] = useState<resultsType[]>([]);
  const [teams, setTeams] = useState<resultsType[]>([]);
  const [patches, setPatches] = useState<string[]>([]);
  const [championsPicked, setChampionsPicked] = useState<resultsType[]>([]);
  const [championsBanned, setChampionsBanned] = useState<resultsType[]>([]);
  const [champPickedMode, setChampPickedMode] = useState<"Any" | "Only">("Any");
  const [champBannedMode, setChampBannedMode] = useState<"Any" | "Only">("Any");
  // Fetch game versions from Data Dragon
  const [isLoadingPatches, setIsLoadingPatches] = useState(true);

  useEffect(() => {
    async function fetchPatches() {
      try {
        const response = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const versions: string[] = await response.json();

        const formattedVersions = versions.map((version: string) =>
          version.split(".").slice(0, 2).join(".")
        );

        setPatches([...new Set(formattedVersions)]);
      } catch (error) {
        console.error("Error fetching patches:", error);
      } finally {
        setIsLoadingPatches(false);
      }
    }
    fetchPatches();
  }, []);

  async function fetchPlayersByNickname(nickname: string) {
    const players: String[] = await invoke("get_players", { search: nickname });
    console.log(players);

    return players.map((player: any) => ({
      label: player,
      value: player,
      // no logoUrl here, but you can add something if needed
    }));
  }
  async function fetchTeamsByName(name: string) {
    const teams: { team_name: string; team_logo: string }[] = await invoke(
      "get_teams",
      { search: name }
    );
    console.log(teams);

    return teams.map((team) => ({
      label: team.team_name,
      value: team.team_name,
      logoUrl: team.team_logo,
    }));
  }

  // ----------------------------------------------------------------
  // 3) FETCH the newest LoL version and the champion list
  const [champions, setChampions] = useState<resultsType[]>([]);

  useEffect(() => {
    async function loadChamps() {
      try {
        // 1) Get the array of versions, newest is first
        const versionsRes = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const versionsData: string[] = await versionsRes.json();
        const latestVersion = versionsData[0]; // e.g., "14.24.1"

        // 2) Fetch champion data for that version
        const champsRes = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
        );
        const champsJson = await champsRes.json();

        // champsJson.data has a shape like:
        // { Aatrox: { key: "266", name: "Aatrox", image: { full: "Aatrox.png" }}, ... }
        const data = champsJson.data || {};
        const mapped = Object.keys(data).map((champKey) => {
          const champ: ChampionRaw = data[champKey];
          return {
            champ: champKey,
            label: champ.name,
            value: champ.key, // the numeric ID as a string
            logoUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champ.image.full}`,
          };
        });

        setChampions(mapped);
      } catch (err) {
        console.error("Error loading champion data:", err);
      }
    }

    loadChamps();
  }, []);

  // A local "fetch" function that filters the above `champions` by searchTerm
  function fetchChampsByName(searchTerm: string) {
    const lower = searchTerm.toLowerCase();
    // Return anything that has the searchTerm in the champion label
    return Promise.resolve(
      champions.filter((c) => c.label.toLowerCase().includes(lower))
    );
  }

  // ----------------------------------------------------------------
  // 4) On mount, load from localStorage
  useEffect(() => {
    let filterConfigStr = localStorage.getItem("filterConfig");
    if (!filterConfigStr) {
      let d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      const defaultConfig: FilterConfig = {
        dateRange: {
          from: d,
          to: new Date(),
        },
        wins: true,
        losses: true,
        patch: "",
        championsPicked: [],
        champPickedMode: "Any",
        championsBanned: [],
        champBannedMode: "Any",
        teams: [],
        players: [],
      };
      localStorage.setItem("filterConfig", JSON.stringify(defaultConfig));
      filterConfigStr = JSON.stringify(defaultConfig);
    }

    const filterConfig: FilterConfig = JSON.parse(filterConfigStr!);

    // Load each field into local state
    setWins(filterConfig.wins);
    setLosses(filterConfig.losses);
    setPatch(filterConfig.patch);
    setDateRange(filterConfig.dateRange);
    setChampionsPicked(filterConfig.championsPicked || []);
    setChampionsBanned(filterConfig.championsBanned || []);
    setTeams(filterConfig.teams || {});
    setPlayers(filterConfig.players || {});
  }, []);

  // ----------------------------------------------------------------
  // Example usage with ShadCN <Checkbox> you might want to store these changes in state
  // So that we can reflect them in localStorage on "Save changes"
  // const handleToggleWins = () => setWins((prev) => !prev);
  // const handleToggleLosses = () => setLosses((prev) => !prev);

  // We'll do something similar for patch input
  const handlePatchChange = (e: string) => {
    setPatch(e);
  };

  // (Optional) If you want a date-range that updates local state, you'd pass
  // a callback to <DatePickerWithRange> so you can track changes. Shown as placeholder.
  const handleDialogClose = () => {
    const filterConfig: FilterConfig = {
      dateRange,
      wins,
      losses,
      patch,
      championsPicked,
      champPickedMode,
      championsBanned,
      champBannedMode,
      teams,
      players,
    };
    if (JSON.stringify(filterConfig) !== localStorage.getItem("filterConfig")) {
      localStorage.setItem("filterConfig", JSON.stringify(filterConfig));
      window.dispatchEvent(new Event("filtersUpdated"));
    }
  };
  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleDialogClose();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-[10%] w-full text-xl flex items-center justify-center border-t-2 border-foreground bg-foreground hover:bg-gray-900">
          Filters
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Filters</DialogTitle>
          <DialogDescription>
            Filter out games based on different criteria. Filters will update
            when this window closes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="datepicker" className="text-right">
              Date Range
            </Label>
            <DatePickerWithRange
              id="datepicker"
              initialDateRange={dateRange}
              onChange={(newVal) => {
                newVal && setDateRange(newVal);
              }}
            />
          </div>

          {/* Wins / Losses */}
          {/* <div className="grid grid-cols-4 gap-4 items-center">
            <Label htmlFor="wins" className="text-right">
              Wins
            </Label>
            <Checkbox
              id="wins"
              checked={wins}
              className="col-span-3"
              onCheckedChange={handleToggleWins}
            />
            <Label htmlFor="losses" className="text-right">
              Losses
            </Label>
            <Checkbox
              id="losses"
              checked={losses}
              className="col-span-3"
              onCheckedChange={handleToggleLosses}
            />
          </div> */}

          {/* Patch Input */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label htmlFor="patch" className="text-right">
              Patch
            </Label>
            <Combobox
              id="patch"
              options={
                isLoadingPatches
                  ? [{ label: "Loading...", value: "" }]
                  : patches.map((p) => ({ label: p, value: p }))
              }
              value={patch}
              onChange={handlePatchChange}
              placeholder={
                isLoadingPatches ? "Loading patches..." : "Select a patch"
              }
            />
          </div>

          {/* Search & Select for Players */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Players</Label>
            <SearchSelectCommand
              setSelected={setPlayers}
              selected={players}
              fetchFn={fetchPlayersByNickname}
              placeholder="Filter Players"
            />
          </div>

          {/* Search & Select for Teams */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Teams</Label>
            <SearchSelectCommand
              setSelected={setTeams}
              selected={teams}
              fetchFn={fetchTeamsByName}
              placeholder="Filter Teams"
            />
          </div>

          {/* Search & Select for Champs Picked */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Champs Picked</Label>
            <SearchSelectCommandModes
              setSelected={setChampionsPicked}
              setSelectMode={setChampPickedMode}
              selected={championsPicked}
              selectMode={champPickedMode}
              fetchFn={fetchChampsByName}
              placeholder="Select Champions Picked"
            />
          </div>

          {/* Search & Select for Champs Banned */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Champs Banned</Label>
            <SearchSelectCommandModes
              setSelected={setChampionsBanned}
              setSelectMode={setChampBannedMode}
              selected={championsBanned}
              selectMode={champBannedMode}
              fetchFn={fetchChampsByName}
              placeholder="Select Champions Banned"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Filter;

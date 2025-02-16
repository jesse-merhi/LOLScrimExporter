import { Champion } from "@/lib/types/champions";
import { ScrollArea } from "./ui/scroll-area";

// Types (adjust the import path as needed)
export interface Draft {
  bans1Blue: string[];
  bans1Red: string[];
  picks1Blue: string[];
  picks1Red: string[];
  picks2Blue: string[];
  picks2Red: string[];
  picks3Blue: string[];
  picks3Red: string[];
  picks4Blue: string[];
  picks4Red: string[];
  bans2Blue: string[];
  bans2Red: string[];
}

export interface DraftLog {
  node: DraftNode;
}

export interface DraftNode {
  type: string;
  sentenceChunks: SentenceChunk[];
}

export interface SentenceChunk {
  text: string;
  strikethrough: boolean;
}

const DEFAULT_DRAFT: Draft = {
  bans1Blue: [],
  bans1Red: [],
  picks1Blue: [],
  picks1Red: [],
  picks2Blue: [],
  picks2Red: [],
  picks3Blue: [],
  picks3Red: [],
  picks4Blue: [],
  picks4Red: [],
  bans2Blue: [],
  bans2Red: [],
};

interface DraftProps {
  eventLog: DraftLog[];
  champions: Record<string, Champion>;
  patch: string;
}

function Draft({ eventLog, champions, patch }: DraftProps) {
  // --- Parse Draft Data ---
  const parseDraftOrder = (draftLog: DraftLog[]): Draft => {
    const draft: Draft = {
      bans1Blue: [],
      bans1Red: [],
      picks1Blue: [],
      picks1Red: [],
      picks2Blue: [],
      picks2Red: [],
      picks3Blue: [],
      picks3Red: [],
      picks4Blue: [],
      picks4Red: [],
      bans2Blue: [],
      bans2Red: [],
    };

    let blueTeam = "";
    let redTeam = "";
    const pickOrder = [
      { team: "blue", picks: 1 },
      { team: "red", picks: 2 },
      { team: "blue", picks: 2 },
      { team: "red", picks: 1 },
      { team: "red", picks: 1 },
      { team: "blue", picks: 2 },
      { team: "red", picks: 1 },
    ];
    let pickStage = 0;
    let bluePickIndex = 1;
    let redPickIndex = 1;

    draftLog.forEach((e) => {
      const [team, action, champion] = e.node.sentenceChunks.map(
        (chunk) => chunk.text
      );

      if (!blueTeam || !redTeam) {
        if (!blueTeam) blueTeam = team;
        else if (team !== blueTeam && !redTeam) redTeam = team;
      }

      if (action === "banned") {
        if (team === blueTeam && draft.bans1Blue.length < 3) {
          draft.bans1Blue.push(champion);
        } else if (team === redTeam && draft.bans1Red.length < 3) {
          draft.bans1Red.push(champion);
        } else if (team === blueTeam) {
          draft.bans2Blue.push(champion);
        } else {
          draft.bans2Red.push(champion);
        }
      } else if (action === "picked") {
        const currentPick = pickOrder[pickStage];
        if (
          (team === blueTeam && currentPick.team === "blue") ||
          (team === redTeam && currentPick.team === "red")
        ) {
          if (currentPick.team === "blue") {
            const key = `picks${bluePickIndex}Blue` as keyof Draft;
            draft[key].push(champion);
            if (draft[key].length >= currentPick.picks) {
              bluePickIndex++;
              pickStage++;
            }
          } else {
            const key = `picks${redPickIndex}Red` as keyof Draft;
            draft[key].push(champion);
            if (draft[key].length >= currentPick.picks) {
              redPickIndex++;
              pickStage++;
            }
          }
        }
      }
    });

    return draft;
  };

  // --- Compute Draft Data ---
  let draftData: Draft = DEFAULT_DRAFT;
  if (eventLog && eventLog.length > 0) {
    const validatedIndex = eventLog.findIndex(
      (element) => element.node.type === "grid-validated-series"
    );
    const validatedData =
      validatedIndex >= 0 ? eventLog.slice(validatedIndex + 1) : eventLog;
    draftData = parseDraftOrder(validatedData);
  }

  // --- Helper: Get Champion Image Filename ---
  const getChampionImage = (championName: string) => {
    const champKey = Object.keys(champions).find(
      (key) => champions[key].name === championName
    );
    return champKey ? champions[champKey].image.full : null;
  };

  // --- Render Champion Images ---
  const renderChampionImages = (championNames: string[], patch: string) => {
    return championNames.map((champion) => {
      const image = getChampionImage(champion);
      return (
        image && (
          <img
            key={champion}
            className="h-14 w-14"
            src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${image}`}
            alt={champion}
          />
        )
      );
    });
  };

  return (
    <ScrollArea className="overflow-auto p-6 w-full h-full">
      {/* Render the draft phases */}
      {/* --- Ban Phase 1 --- */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold mb-2">First Ban Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-500 p-4 rounded-lg">
            <div className="flex justify-center h-14">
              {renderChampionImages(draftData.bans1Blue, patch)}
            </div>
          </div>
          <div className="bg-red-500 p-4 rounded-lg">
            <div className="flex justify-center h-14">
              {renderChampionImages(draftData.bans1Red, patch)}
            </div>
          </div>
        </div>
      </div>

      {/* --- Pick Phase --- */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold mb-2">Pick Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-600 p-4 rounded-lg h-48">
            {renderChampionImages(draftData.picks1Blue, patch)}
            {renderChampionImages(draftData.picks2Blue, patch)}
          </div>
          <div className="bg-red-600 p-4 rounded-lg flex flex-col justify-end items-end h-48">
            {renderChampionImages(draftData.picks1Red, patch)}
            {renderChampionImages(draftData.picks2Red, patch)}
          </div>
        </div>
      </div>

      {/* --- Ban Phase 2 --- */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold mb-2">Second Ban Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-500 p-4 rounded-lg">
            <div className="flex justify-center h-14">
              {renderChampionImages(draftData.bans2Blue, patch)}
            </div>
          </div>
          <div className="bg-red-500 p-4 rounded-lg">
            <div className="flex justify-center h-14">
              {renderChampionImages(draftData.bans2Red, patch)}
            </div>
          </div>
        </div>
      </div>

      {/* --- Final Pick Phase --- */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Final Pick Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-600 p-4 rounded-lg h-36">
            {renderChampionImages(draftData.picks3Blue, patch)}
          </div>
          <div className="bg-red-600 p-4 rounded-lg flex flex-col items-end justify-end h-36">
            {renderChampionImages(draftData.picks3Red, patch)}
            {renderChampionImages(draftData.picks4Red, patch)}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export default Draft;

import { GameStats } from "./types/gameStats";
import { Participant } from "./types/types";

export async function fetchChampionData(patch: string | undefined) {
    const response = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/champion.json`
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch champions for patch ${patch}`);
    }
    return response.json();
}

/**
 * For each champion, create a new Image() and wait for it to load.
 * Returns when ALL champion images have been fetched or at least attempted.
 */
export async function preloadChampionImages(patch: string, participants: Participant[]) {
    // Artificial delay for testing Suspense
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const championJson = await fetchChampionData(patch);
    const champions: Record<string, { image: { full: string }, id: string }> = championJson.data;
    console.log(Object.values(champions).filter((champ) => participants.some((particpant) => particpant.champion_name == champ.id)))


    const loaders = Object.values(champions).filter((champ) => participants.some((particpant) => particpant.champion_name == champ.id)).map((champ) => {
        const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${champ.image.full}`;
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => resolve();
            img.onerror = (err) => reject(err);
        });
    });

    return Promise.allSettled(loaders);
}


export async function fetchItemData(patch: string) {
    const response = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/item.json`
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch items for patch ${patch}`);
    }
    return response.json(); // { data: { "1001": {...}, "1004": {...}, ... } }
}




/**
 * For each item, create a new Image() and wait for it to load.
 * Returns when ALL item images have been fetched or at least attempted.
 */
export async function preloadItemImages(
    patch: string,
    participants: Participant[]
) {
    const itemJson = await fetchItemData(patch)
    const reqItems = getItemIdsFromParticipants(participants);
    const items: Record<string, { image: { full: String } }> = itemJson.data;
    const loaders = Object.entries(items).filter((item) => reqItems.includes(Number(item[0]))).map((item) => {
        const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${item[1].image.full}`;
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => resolve();
            img.onerror = (err) => reject(err);
        });
    });

    return Promise.allSettled(loaders);
}

export function getItemIdsFromParticipants(participants: Participant[]) {
    const stats = participants.map((participant) => JSON.parse(participant.stats_json) as GameStats);
    return stats.flatMap((stat) => [stat.item0, stat.item1, stat.item2, stat.item3, stat.item4, stat.item5])
}
export function findClosestPatch(
    targetPatch: string,
    availablePatches: string[]
): string {
    // If the exact patch exists, use it
    if (!availablePatches || !targetPatch) {
        return ""
    }
    if (availablePatches.includes(targetPatch)) {
        return targetPatch;
    }

    // Find the closest patch by comparing versions
    let closestPatch = availablePatches[0];
    let smallestDiff = Math.abs(
        compareVersions(targetPatch, availablePatches[0])
    );

    for (const patch of availablePatches) {
        if (targetPatch.startsWith(patch)) {
            return patch
        }
        const diff = Math.abs(compareVersions(targetPatch, patch));
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closestPatch = patch;
        }
    }

    return closestPatch;
}

function compareVersions(v1: string, v2: string): number {
    const normalize = (v: string) =>
        v.replace(/[^0-9.]/g, "").split(".").map(Number);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);

    // If both versions have at least two segments, compare only the first two;
    // otherwise, compare up to the number of segments in the shorter version.
    const segmentsToCompare = (parts1.length >= 2 && parts2.length >= 2)
        ? 2
        : Math.min(parts1.length, parts2.length);

    for (let i = 0; i < segmentsToCompare; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 !== part2) {
            return part1 - part2;
        }
    }
    return 0;
}

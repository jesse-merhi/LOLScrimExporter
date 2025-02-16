export async function fetchChampionData(patch: string) {
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
export async function preloadChampionImages(
    patch: string
) {
    const championJson = await fetchChampionData(patch)
    const champions: Record<string, { image: { full: String } }> = championJson.data;

    const loaders = Object.values(champions).map((champ) => {
        const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${champ.image.full}`;
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => resolve();
            img.onerror = (err) => reject(err);
        });
    });

    // Wait until all images either load or error out
    await Promise.allSettled(loaders);
    // Optionally handle errors vs. successes,
    // but typically we just want to ensure they've at least been requested.
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
    patch: string
) {
    const itemJson = await fetchItemData(patch)
    const items: Record<string, { image: { full: String } }> = itemJson.data;
    const loaders = Object.values(items).map((item) => {
        const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${item.image.full}`;
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => resolve();
            img.onerror = (err) => reject(err);
        });
    });

    await Promise.allSettled(loaders);
}

export async function findClosestPatch(
    targetPatch: string,
    availablePatches: string[]
): Promise<string> {
    // If the exact patch exists, use it
    if (availablePatches.includes(targetPatch)) {
        return targetPatch;
    }

    // Find the closest patch by comparing versions
    let closestPatch = availablePatches[0];
    let smallestDiff = Math.abs(
        compareVersions(targetPatch, availablePatches[0])
    );

    for (const patch of availablePatches) {
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
        v
            .replace(/[^0-9.]/g, "")
            .split(".")
            .map(Number);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 !== part2) {
            return part1 - part2;
        }
    }
    return 0;
}
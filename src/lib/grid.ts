export async function preloadTeamLogos(teams: { baseInfo?: { logoUrl?: string } }[]) {
    if (!teams || teams.length === 0) return;

    // Extract all valid logo URLs
    const logoUrls = teams
        .map((team) => team.baseInfo?.logoUrl)
        .filter((url): url is string => !!url); // Ensure only valid URLs
    if (logoUrls.length === 0) return;

    // Preload all team logos asynchronously
    const loaders = logoUrls.map((url) => {
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = (err) => {
                console.warn(`Failed to preload team logo: ${url}`, err);
                reject(err);
            };
        });
    });

    await Promise.allSettled(loaders);
}

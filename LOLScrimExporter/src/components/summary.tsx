import { GameStats } from '@/lib/types/gameStats';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

function Summary({
  gameSummary,
  scores,
}: {
  gameSummary: GameStats[];
  scores: number[];
}) {
  return (
    <ScrollArea className='overflowy-auto px-4 w-full h-full'>
      {gameSummary ? (
        gameSummary.map((player, index) => (
          <>
            {index == 0 && (
              <div className='flex-row flex items-center my-2'>
                {' '}
                <h1 className='text-lg font-semibold'>Blue Team</h1>{' '}
                {scores[0] > scores[1] ? (
                  <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-blue-500 text-white'>
                    Victory
                  </h1>
                ) : (
                  <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-red-500 text-white'>
                    Defeat
                  </h1>
                )}
              </div>
            )}
            <div
              key={index}
              className='mb-2 flex justify-left items-center flex-row '
            >
              <div className=' w-[30%] flex flex-row justify-start items-center '>
                <img
                  className='h-10 w-10'
                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${player.championName}.png`}
                />
                <h1 className='px-3 text-xl w-[18%] text-center'>
                  {player.champLevel}
                </h1>
                <div className='flex items-start justify-center flex-col'>
                  <div className='font-semibold'>{player.riotIdGameName}</div>
                  <div>{player.championName}</div>
                </div>
              </div>
              <div className='w-[15%]  justify-center items-center text-center'>
                <div>
                  {player.kills}/{player.deaths}/{player.assists}
                </div>
              </div>
              <div className='flex items-center justify-center flex-row'>
                {[0, 1, 2, 3, 4, 5]
                  .map(
                    (item) =>
                      (player[('item' + item) as keyof GameStats] as number) ??
                      0
                  )
                  .sort((a, b) => b - a)
                  .map((item) =>
                    item ? (
                      <img
                        className='h-10 w-10'
                        src={`https://opgg-static.akamaized.net/meta/images/lol/latest/item/${item}.png`}
                      />
                    ) : (
                      <div className='border-2 border-slate-500 h-10 w-10'></div>
                    )
                  )}
                <img
                  className='h-10 w-10'
                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/item/${player['item6']}.png`}
                />
              </div>
              <div className='w-[10%] items-center  justify-center flex'>
                {' '}
                {player.totalMinionsKilled}
                cs
              </div>{' '}
              <div className='w-[10%] items-center justify-center flex'>
                {' '}
                {parseInt(player.goldEarned).toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}
                g
              </div>
            </div>
            {index == 4 && (
              <div className='flex-row flex items-center'>
                <Separator className='my-4 ' />
              </div>
            )}
            {index == 4 && (
              <div className='flex-row flex items-center my-2'>
                <h1 className='text-lg font-semibold'>Red Team</h1>
                {scores[1] > scores[0] ? (
                  <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-blue-500 text-white'>
                    Victory
                  </h1>
                ) : (
                  <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-red-500 text-white'>
                    Defeat
                  </h1>
                )}
              </div>
            )}
          </>
        ))
      ) : (
        <div>No Game Data Found</div>
      )}
    </ScrollArea>
  );
}

export default Summary;

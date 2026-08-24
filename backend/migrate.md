npm run db:migrate:players:local
npm run db:migrate:players:local -- --apply

npm run db:migrate:players:prod
npm run db:migrate:players:prod -- --apply

npm run db:migrate:player-current-nickname:local
npm run db:migrate:player-current-nickname:local -- --apply

npm run db:migrate:player-current-nickname:prod
npm run db:migrate:player-current-nickname:prod -- --apply

npm run db:migrate:lotto-bingo-player-refs:local
npm run db:migrate:lotto-bingo-player-refs:local -- --apply

npm run db:migrate:lotto-bingo-player-refs:prod
npm run db:migrate:lotto-bingo-player-refs:prod -- --apply

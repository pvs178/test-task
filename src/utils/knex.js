import { migrate, seed } from '../postgres/knex.js'

const command = process.argv[2]
const arg = process.argv[3]

const commands = {
    migrate: {
        latest: () => migrate.latest(),
        rollback: () => migrate.rollback(),
        up: () => migrate.up(arg),
        down: () => migrate.down(arg),
        list: () => migrate.list(),
        make: () => migrate.make(arg),
    },
    seed: {
        run: () => seed.run(),
        make: () => seed.make(arg),
    },
}

if (!command || !commands[command]) {
    console.error('Available commands:')
    console.error('  migrate latest|rollback|up|down|list|make <name>')
    console.error('  seed run|make <name>')
    process.exit(1)
}

const subCommand = process.argv[3]

if (command === 'migrate' && subCommand && commands[command][subCommand]) {
    await commands[command][subCommand]()
} else if (command === 'seed' && subCommand && commands[command][subCommand]) {
    await commands[command][subCommand]()
} else {
    console.error(`Unknown subcommand: ${subCommand}`)
    process.exit(1)
}

process.exit(0)


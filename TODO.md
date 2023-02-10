
# Powers Prototype

The prototype is textual[^17] (Typescript) based on the software architecture described in [^18].
It uses node with extend ANSI to render the game.

# Issues

- [ ] The corridor is merging the floor with the rooms. The room must remove the empty tiles. Problem to vault room witch all tiles are importart.

# Controls

- ': Log Messages
- 1: item
- 2: equip
- 3: skill
- 4: talk


# TODO

- [ ] Room database
- [ ] Map database
- [ ] Vault database (boss, puzzle)
- [ ] Monster database
- [ ] Monsters generator
- [ ] Itens generator
- [ ] Traps generator
- [ ] Vaults
- [ ] Inventory
- [x] Migrate to js to use prototype based inheritance.
- [x] Refactor removing references to Point. The world is a one dimensional array using the index as keys.
- [x] Refactor render message (move to Main accessing Context).
- [x] Fix Dijkstra Map.

# Elementick story

## Premise (shown before the first Champion Road fight)

Every summer the eight districts of Brightvale hold the Grand Circuit, a tournament for elemental stick fighters. This year a masked fighter called Null has entered. Null has never been hit. Not once. Every champion Null beats loses their element for a whole year, and the districts are going dark. You are a rookie from the Rooftop Gym with one element and one best friend. Time to enter the Circuit.

Tone: short, funny lines, one or two per champion before the fight and one after. No ink, erasing, storybooks, drawn lines, sparks or echoes (owner rule). No names from earlier majen projects or other works.

## Structure

- 8 districts, 5 champions each (fights 1 to 40), then Null in the Crown Arena (fight 41).
- Each champion fights with a tag partner (second element). Bot difficulty climbs from Rookie (1) to Legend (5).
- The 5th champion of each district is the district boss: boss music and, on the first win, a free element.
- First wins pay bonus coins. Rematches pay normal rewards.

## Endings (after the first win against Null)

The player chooses:

- **Take the crown:** you win the Grand Circuit and every district gets its element back the moment Null falls. Null takes off the mask: a tired old champion who never lost a match in sixty years. He bows, hands you the crown and walks into the crowd.
- **Offer a hand:** you hold out your hand instead. "Nobody has ever offered me a rematch," Null says. Brightvale now has two champions and a weekly rematch.

Both endings unlock free play: rematch any champion, the Ranked Ladder and Zombie Survival.

## Champions (generated from `src/content/champions.ts`)

### Rooftop Row
Windy rooftops where every fighter starts.

- **Kit Tallow** (wind + wind, Lv 2, bot 1): "First fight? I will go easy on you. Just kidding. I never go easy!" / after: "Okay, okay, you are good.".
- **Rook Danner** (light + wind, Lv 3, bot 1): "My mum says I fight like a lighthouse. Bright, tall, and very loud." / after: "I need a brighter plan.".
- **Sunny Ko** (light + water, Lv 4, bot 1): "Light beats Time, Water beats Light. I made a chart. Want to see it?" / after: "Your chart was better than mine.". Unlocks **water**.
- **Gusty Mae** (wind + lightning, Lv 5, bot 2): "I jump twice. You jump once. Math! Catch me if you can." / after: "You caught me. Rude.".
- **Captain Vela** (wind + light, Lv 7, bot 2): "I rule these roofs, rookie. Null took my crown once. Not again." / after: "Go. Beat Null for all of us.". Unlocks **wind**.

### Mosswood
A green maze of vines and hidden traps.

- **Fern Odell** (leaf + leaf, Lv 8, bot 2): "Watch your step. Literally. I planted mines everywhere." / after: "I forgot where my own mines were.".
- **Barkley** (leaf + earth, Lv 9, bot 2): "I stand like a tree. You cannot push a tree." / after: "Fine. You can push a tree.".
- **Willa Root** (leaf + water, Lv 10, bot 2): "Roots drink rivers. I drink tea. Then I win." / after: "The tea was cold anyway.". Unlocks **light**.
- **Mossy Gus** (earth + leaf, Lv 11, bot 2): "Mossy is my name and my mood. Slow and steady." / after: "Too slow. Too steady.".
- **Elder Thorne** (leaf + gravity, Lv 13, bot 3): "The forest remembers every fighter. It will remember you losing." / after: "The forest will remember you winning.". Unlocks **leaf**.

### Magma Works
Hot factories that never sleep.

- **Spitfire Jo** (fire + fire, Lv 14, bot 2): "Hot hands, hot feet, hot temper. Mostly the temper." / after: "I need to cool down.".
- **Forge Boss Hal** (fire + earth, Lv 15, bot 3): "I hammer steel for breakfast. You look softer than steel." / after: "Okay. You are steel.".
- **Kenna Vox** (fire + lightning, Lv 16, bot 3): "Fire and storm. Twice the boom. Earmuffs recommended." / after: "My ears are ringing. In a good way.".
- **Slag Twins** (earth + fire, Lv 17, bot 3): "There are two of us. Well, there are always two of everyone here." / after: "We lost twice as hard.".
- **Furnace Queen Ada** (fire + water, Lv 19, bot 3): "My furnace has burned for 40 years. Null tried to put it out." / after: "Keep my fire going. Win.". Unlocks **fire**.

### Frost Harbor
A frozen port where fighters slide into trouble.

- **Skate Lin** (ice + ice, Lv 20, bot 3): "I skate faster than you run. Ice is my floor." / after: "I slipped. You saw nothing.".
- **Harbor Pete** (water + ice, Lv 21, bot 3): "Forty years on the docks. Forty years of cold fists." / after: "Warm handshake?".
- **Glacia Moon** (ice + light, Lv 22, bot 3): "Sun on snow is my favorite trick. Can you look at it?" / after: "You looked right through it.".
- **Blizz Brothers** (ice + wind, Lv 23, bot 3): "Wind plus ice equals blizzard. We did the math too." / after: "Our math was wrong.".
- **Admiral Frost** (ice + water, Lv 25, bot 4): "I froze the whole harbor once. Null did not even shiver." / after: "You made me shiver. Thank you.". Unlocks **ice**.

### Thunder Heights
Cloud platforms where storms are a sport.

- **Volt Kid** (lightning + lightning, Lv 26, bot 3): "Zap! That was the warning. The next one is not." / after: "I am out of zaps.".
- **Storm Sister Ione** (lightning + wind, Lv 27, bot 4): "The clouds answer to me. Today they say no to you." / after: "The clouds changed their mind.".
- **Dyno Ray** (lightning + water, Lv 28, bot 4): "I power the whole district. Try not to trip the breaker." / after: "Breaker tripped. Lights out.".
- **Arc Duo** (lightning + gravity, Lv 29, bot 4): "We hop behind you. Every time. Look behind you. Too late." / after: "You looked behind us first.".
- **Highlord Tesca** (lightning + light, Lv 31, bot 4): "Thunder Heights bows to nobody. Not Null. Not you." / after: "Fine. One small bow.". Unlocks **lightning**.

### Dune Quarry
Stone pits and old ruins under a huge sun.

- **Pebble Pax** (earth + earth, Lv 32, bot 4): "I throw rocks. Big ones. Bigger than you." / after: "The rocks were heavy. I am tired.".
- **Sandy Rourke** (earth + wind, Lv 33, bot 4): "Sand in your eyes, sand in your shoes. That is the Quarry welcome." / after: "Shake out your shoes. You earned it.".
- **Digger May** (earth + leaf, Lv 34, bot 4): "I dug this whole pit with a spoon. Respect the spoon." / after: "I respect your fists.".
- **Twin Pillars** (earth + light, Lv 35, bot 4): "We hold up the ruins. Do not knock us over." / after: "Oops. The ruins are fine.".
- **Stone Warden Gore** (earth + gravity, Lv 37, bot 4): "Nothing moves me. Not even Null moved me." / after: "You moved me. A little.". Unlocks **earth**.

### Skyline Ruins
A broken skyline where gravity forgets itself.

- **Float Fia** (gravity + gravity, Lv 38, bot 4): "Up is down here. Down is lunch. I am hungry." / after: "Lunch break. You win.".
- **Heavy Hux** (gravity + earth, Lv 39, bot 4): "I weigh as much as a building. Some days two buildings." / after: "You lifted two buildings.".
- **Spin Ollie** (gravity + light, Lv 40, bot 5): "I spin around you like a moon. You get dizzy, I win." / after: "I got dizzy first.".
- **Neon Sasha** (gravity + lightning, Lv 41, bot 5): "This city glows for me. Tonight it glows for my win." / after: "Tonight it glows for you.".
- **Duchess Vantor** (gravity + time, Lv 43, bot 5): "I have watched a hundred Circuits. Null is the only one who scared me." / after: "Now you scare me too. Good.". Unlocks **gravity**.

### Clocktower Square
The heart of Brightvale, where the Circuit ends.

- **Tick Tam** (time + time, Lv 44, bot 5): "I will rewind your best move. Then rewind it again." / after: "I ran out of rewind.".
- **Professor Hourne** (time + water, Lv 45, bot 5): "I studied every fighter in the Circuit. You are chapter forty-one." / after: "I need to add a chapter.".
- **Second Hand Sal** (time + fire, Lv 46, bot 5): "One second is all I need. You have fifty-nine left." / after: "That was a long second.".
- **Chrono Pair** (time + ice, Lv 47, bot 5): "We freeze time and you. Mostly you." / after: "Time melts. So did we.".
- **Grand Marshal Oda** (time + gravity, Lv 49, bot 5): "I run the Circuit. I let Null in. Prove I was wrong to." / after: "Go. Null is waiting in the Crown Arena.". Unlocks **time**.
### Crown Arena
- **Null** (time + gravity, Lv 50, bot 5): "You are the first fighter to reach me. Hit me once. Just once. I want to feel it." / after: "You hit me. I finally felt something.".

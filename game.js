const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 800,
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: { preload, create, update }
};

// GLOBAL variables — DO NOT redeclare these anywhere else!
let player, cursors;
let dialogueBox, dialogueText;
let signBox, signText, signMask, maxSignScroll;

let domInputActive = false;
let npcSelections;
let dialogueActive = false;
let justAsked = { orc: false, wizard: false, druid: false };

let orcLayer, wizardLayer, druidLayer;

let recListActive = true;        // GLOBAL!
let recListHideAt = 0;            // GLOBAL!

function showDOMInputPrompt(promptText, callback) {
    let prev = document.getElementById('phaserInputPrompt');
    if (prev) prev.remove();

    const gameCanvas = document.querySelector('canvas');
    const parentRect = gameCanvas.getBoundingClientRect();

    let bg = document.createElement('div');
    bg.style.position = 'fixed';
    bg.style.left = parentRect.left + 'px';
    bg.style.top = parentRect.top + 'px';
    bg.style.width = parentRect.width + 'px';
    bg.style.height = parentRect.height + 'px';
    bg.style.background = 'rgba(0,0,0,0.65)';
    bg.style.zIndex = 5001;

    let box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.left = (parentRect.width/2 - 210) + 'px';
    box.style.top = (parentRect.height/2 - 80) + 'px';
    box.style.width = '420px';
    box.style.padding = '18px 24px 18px 24px';
    box.style.background = '#222';
    box.style.borderRadius = '14px';
    box.style.textAlign = 'center';
    box.style.boxShadow = '0 0 30px #000c';

    let label = document.createElement('div');
    label.innerText = promptText;
    label.style.color = '#fff';
    label.style.fontSize = '20px';
    label.style.marginBottom = '12px';
    box.appendChild(label);

    let input = document.createElement('input');
    input.type = 'text';
    input.style.width = '96%';
    input.style.fontSize = '20px';
    input.style.borderRadius = '7px';
    input.style.border = '1.5px solid #aaa';
    input.style.padding = '8px 6px';
    input.autocomplete = 'off';
    input.spellcheck = false;
    box.appendChild(input);

    let cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancel';
    cancelBtn.style.marginTop = '18px';
    cancelBtn.style.marginLeft = '12px';
    cancelBtn.style.fontSize = '17px';
    cancelBtn.style.padding = '6px 18px';
    cancelBtn.style.borderRadius = '7px';
    cancelBtn.style.border = '1.5px solid #999';
    cancelBtn.style.background = '#444';
    cancelBtn.style.color = '#fff';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onmouseenter = () => cancelBtn.style.background = '#888';
    cancelBtn.onmouseleave = () => cancelBtn.style.background = '#444';
    cancelBtn.onclick = function() {
        domInputActive = false;
        bg.remove();
        callback('');
    };
    box.appendChild(cancelBtn);

    input.onkeydown = (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') cancelBtn.click();
        e.stopPropagation();
    };

    function submit() {
        domInputActive = false;
        bg.remove();
        callback(input.value.trim());
    }

    input.onblur = () => { setTimeout(() => input.focus(), 10); };

    bg.onclick = e => {
        if (e.target === bg) {
            if (input.value.trim()) submit();
            else cancelBtn.click();
        }
    };
    box.onclick = e => e.stopPropagation();

    bg.appendChild(box);
    bg.id = 'phaserInputPrompt';
    document.body.appendChild(bg);

    domInputActive = true;
    setTimeout(()=>input.focus(), 50);
}

new Phaser.Game(config);

function preload() {
    this.load.tilemapTiledJSON('map', 'assets/tilemaps/Snow/snowy-map.json');
    this.load.image('snow_tiles',   'assets/tilemaps/Snow/spritesheet.png');
    this.load.image('black_pieces', 'assets/tilemaps/Snow/BlackPieces.png');
    this.load.image('white_pieces', 'assets/tilemaps/Snow/WhitePieces.png');
    this.load.image('board1',       'assets/tilemaps/Snow/board1.png');
    this.load.image('farm_animals', 'assets/tilemaps/Snow/FarmAnimals.png');
    this.load.image('orc_idle',     'assets/tilemaps/Snow/orc3_idle_full.png');
    this.load.image('cinema',       'assets/tilemaps/Snow/OutdoorCinema.png');
    this.load.image('wizard_idle',  'assets/tilemaps/Snow/ROLEWORLD_MC_SKIN PALE_WIZARD IDLE RIGHT 2.png');
    this.load.image('wizard_assets','assets/tilemaps/Snow/ROLEWORLD_WIZARD_FREE INTERIOR ASSET.png');
    this.load.image('winter_tiles', 'assets/tilemaps/Snow/seasonal sample (winter)-1.png');
    this.load.image('sign',         'assets/tilemaps/Snow/sign.png');
    this.load.spritesheet('player','assets/sprites/Maya/Walking Sprite.png',{
        frameWidth: 32, frameHeight: 32
    });
}

function create() {
    this.time.timeScale = 1;
    npcSelections = { orc: null, wizard: null, druid: null };
    justAsked = { orc: false, wizard: false, druid: false };
    recListActive = false;
    recListHideAt = 0;  // <-- Only assign, DO NOT redeclare with let/var!

    const askNPC = (npcName, cb) => {
    let promptText = "";
    switch (npcName) {
        case "Orc":
            promptText = "Orc grunts: 'Oi, Maya! You come to the Snowy Mountain Tavern with no GOLD? And its movie night! ARG, well at least give us some insight into what youre into... What's a movie you like, small one?'";
            break;
        case "Wizard":
            promptText = "Wizard chants: 'Greetings, Maya. As a divination wizard I forsee a good movie in your future...as soon as I can pick out from one of these film rolls. Do you have a favorite movie?'";
            break;
        case "Druid":
            promptText = "Druid whispers: 'MAYA! I need an escape form the sheep...theyre driving me insane. Im in need of a well awaited movie night. Do tell, do you have a movie reccomendation?'";
            break;
        default:
            promptText = `${npcName}: What's a movie you like?`;
    }
    showDOMInputPrompt(promptText, answer => {
        if (answer) cb(answer);
    });
};

    const checkAllSelected = () => {
        const titles = Object.values(npcSelections).filter(v => v);
        if (titles.length === 3) {
            fetchCombinedSimilar(titles, this);
        }
    };

    const map = this.make.tilemap({ key: 'map' });
    const t1  = map.addTilesetImage('snow_tiles','snow_tiles');
    const t2  = map.addTilesetImage('BlackPieces','black_pieces');
    const t3  = map.addTilesetImage('WhitePieces','white_pieces');
    const t4  = map.addTilesetImage('board1','board1');
    const t5  = map.addTilesetImage('FarmAnimals','farm_animals');
    const t6  = map.addTilesetImage('OrcNPC','orc_idle');
    const t7  = map.addTilesetImage('OutdoorCinema','cinema');
    const t8  = map.addTilesetImage('ROLEWORLD_MC_SKIN PALE_WIZARD IDLE RIGHT 2','wizard_idle');
    const t9  = map.addTilesetImage('ROLEWORLD_WIZARD_FREE INTERIOR ASSET','wizard_assets');
    const t10 = map.addTilesetImage('seasonal sample (winter)-1','winter_tiles');
    const t11 = map.addTilesetImage('Sign Post','sign');
    const allTilesets = [t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11];

    map.createLayer('Subterrain', allTilesets, 0, 0);
    map.createLayer('Ground',     allTilesets, 0, 0);

    const wallsLayer = map.createLayer('Walls', allTilesets, 0, 0);
    wallsLayer.setCollisionByExclusion([-1]);

    map.layers.forEach(ld => {
        if (
            ![
              'Subterrain','Ground',
              'Walls','NPC_Orc','NPC_Wizard','NPC Druid'
            ].includes(ld.name)
            && !ld.name.endsWith('Sign')
        ) {
            map.createLayer(ld.name, allTilesets, 0, 0);
        }
    });

    // --- NPCs with debounce AND recListActive guard ---
    orcLayer = map.createLayer('NPC_Orc', t6, 0, 0);
    orcLayer.setTileIndexCallback(257, () => {
        if (!npcSelections.orc && !domInputActive && !justAsked.orc && !recListActive) {
            justAsked.orc = true;
            askNPC('Orc', movie => {
                if (movie) {
                    npcSelections.orc = movie;
                    showQuickDialogue(`Orc: “${movie}” Tsk Tsk... Aliright Champ. Ill think of some movies for you to watch`);
                    checkAllSelected();
                }
            });
        }
    }, this);

    wizardLayer = map.createLayer('NPC_Wizard', t8, 0, 0);
    wizardLayer.setTileIndexCallback(338, () => {
        if (!npcSelections.wizard && !domInputActive && !justAsked.wizard && !recListActive) {
            justAsked.wizard = true;
            askNPC('Wizard', movie => {
                if (movie) {
                    npcSelections.wizard = movie;
                    showQuickDialogue(`Wizard: Ah, “${movie}”… how insightful. The magical weave will get back to me with reccommendations soon.`);
                    checkAllSelected();
                }
            });
        }
    }, this);

    druidLayer = map.createLayer('NPC Druid', t5, 0, 0);
    druidLayer.setTileIndexCallback(349, () => {
        if (!npcSelections.druid && !domInputActive && !justAsked.druid && !recListActive) {
            justAsked.druid = true;
            askNPC('Druid', movie => {
                if (movie) {
                    npcSelections.druid = movie;
                    showQuickDialogue(`Druid: “${movie}” you say? The forest whispers approval!`);
                    checkAllSelected();
                }
            });
        }
    }, this);

    // WIDE, BOTTOM DIALOGUE BOX
    dialogueBox = this.add
        .rectangle(512, 735, 1024, 110, 0x000000, 0.93)
        .setScrollFactor(0)
        .setVisible(false)
        .setDepth(100);
    dialogueText = this.add
        .text(60, 695, '', {
            fontSize: '16px',
            fill: '#ffffff',
            wordWrap: { width: 900 }
        })
        .setScrollFactor(0)
        .setVisible(false)
        .setDepth(101);

    // Signs
    const boxW = 760, boxH = 200;
    signBox = this.add.rectangle(400, 600, boxW, boxH, 0x552200, 0.9)
        .setScrollFactor(0)
        .setVisible(false)
        .setDepth(100);
    signText = this.add.text(400 - boxW/2 + 20, 600 - boxH/2 + 20, '', {
            fontSize: '16px',
            fill: '#f0e0c0',
            wordWrap: { width: boxW - 40 }
        })
        .setScrollFactor(0)
        .setVisible(false)
        .setDepth(100);
    const gfx = this.make.graphics();
    gfx.fillRect(400 - boxW/2, 600 - boxH/2, boxW, boxH);
    signMask = gfx.createGeometryMask();
    signText.setMask(signMask);
    maxSignScroll = 0;

    player = this.physics.add.sprite(130, 280, 'player');
    this.physics.add.collider(player, wallsLayer);

    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
        frameRate: 5,
        repeat: -1
    });

    cursors = this.input.keyboard.createCursorKeys();
    this.cameras.main
        .startFollow(player)
        .setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.physics.add.overlap(player, orcLayer);
    this.physics.add.overlap(player, wizardLayer);
    this.physics.add.overlap(player, druidLayer);

    const showSign = msg => {
        signText.setText(msg).setVisible(true);
        maxSignScroll = Math.max(0, signText.height - boxH + 40);
        signText.y = 600 - boxH/2 + 20;
        signBox.setVisible(true);
        this.time.delayedCall(1000, () => {
            signBox.setVisible(false);
            signText.setVisible(false);
        });
    };
    [
      { name:'DnDSign',    text:'Dungeons & Dragons \nMaya has been playing the same D&D campaign for the past year with her friends! She loves the character shes playing: Taepo Frog the chaotic neutral half-orc Druid on a mission to become one with nature via mainitnaing the balance with decay and rot. She plays with her two friends who are playing as a human monk on a path to find his long lost kin and a half elf ranger set on taming a god who is the cause of a wild storm ravaging her home. Maya has the best Dungeon Master (DM), Chris, who beautifully crafts the adventures we go on! He extremly talented at telling stories and Maya loves reading and listenting to them. The best part is the collaborative story telling with her friends. ' },
      { name:'ChessSign',  text:'Chess \nMaya has been playing chess since 3rd grade. She played competative chess at one point too! It really doenst get much more nerdy than that! She still enjoys the challange of playing "bullet chess". Bullet chess involves trying to win within 1 minute long games. YES, 1 minute! It is a great way to keep her mind sharp, being flexible, and thinking quick on her feet. She finds chess a great allegory to life. Sometimes you have to sacrafice for a future move 3 steps ahead. Also, much like in life, you have to navigate a game with nuiance -- determining when to be defensive and when to offeneive to secure the win!' },
      { name:'SolaceNatureSign', text:'Nature \n Maya loves to be present in moments of solace. She often looks for moments to sit in nature and take it all in. A good time to her is feeling the grass between her toes, smelling the wind flutter through the trees, and listening to the frogs splishing through the pond. Add in some good company, a light snack, and some reading material and thats a party! She wants to one day visit Svalbard which is one of the most northern place you can visit in the world known for being incredibly remote and frigid cold. Pop a squat on the log for a little moment of peace and quiet' },
      { name:'CinemaSign', text:'Cinema \n Maya loves going to the movies. So much so that she will go broad daylight or catch the late-night showing. She does not faulter in her decision to go even if it is with her friends or even by herself! She loves the theater experince. She will find any excuse to see a film on the big screen and feel the rumble of the cinema seats in a thrilling-action movie. She is particulalry fond of horror movies, but her favorite thing to do is go to secret showings. For $5 you can buy tickets to a show, and you wont now what youre sitting down to watch untill the opening credit roll! Feel free to talk to the adventuring party for some movie reccomendations based on 3 movies you like! ' }
    ].forEach(({ name, text }) => {
      const layer = map.createLayer(name, allTilesets, 0, 0);
      layer.setTileIndexCallback(273, () => showSign(text), this);
      this.physics.add.overlap(player, layer);
    });

    this.input.on('wheel', (_ptr, _objs, _dx, dy) => {
        if (signText.visible && maxSignScroll > 0) {
            signText.y = Phaser.Math.Clamp(
                signText.y - dy,
                (600 - boxH/2 + 20) - maxSignScroll,
                600 - boxH/2 + 20
            );
        }
    });
}

function showQuickDialogue(msg) {
    dialogueBox.setVisible(true);
    dialogueText.setText(msg).setVisible(true).setDepth(101);
}

function update() {
    if (domInputActive) {
        player.setVelocity(0,0);
        player.anims.stop();
        return;
    }
    let vx = 0, vy = 0;
    const b = player.body;

    if (cursors.left.isDown  && !b.blocked.left)      vx = -100;
    else if (cursors.right.isDown && !b.blocked.right) vx = 100;
    if (cursors.up.isDown    && !b.blocked.up)        vy = -100;
    else if (cursors.down.isDown && !b.blocked.down)  vy = 100;

    // Only hide dialogue on movement if not rec list
    if (!recListActive && dialogueBox.visible && (vx !== 0 || vy !== 0)) {
        dialogueBox.setVisible(false);
        dialogueText.setVisible(false);
        dialogueActive = false;
    }

    player.setVelocity(vx, vy);
    if (vx || vy) player.anims.play('walk', true);
    else          player.anims.stop();

    const tileX = Math.floor(player.x / 32);
    const tileY = Math.floor(player.y / 32);

    function notOnTile(layer, tileIndex) {
        const tile = layer.hasTileAt(tileX, tileY) ? layer.getTileAt(tileX, tileY) : null;
        return !(tile && tile.index === tileIndex);
    }
    if (orcLayer && notOnTile(orcLayer, 257)) justAsked.orc = false;
    if (wizardLayer && notOnTile(wizardLayer, 338)) justAsked.wizard = false;
    if (druidLayer && notOnTile(druidLayer, 349)) justAsked.druid = false;

    // Rec List Manual Timer: Hide after 15s (browser-accurate)
    if (recListActive) {
        const timeLeft = (recListHideAt - Date.now()) / 1000;
        console.log(`RecListActive: time left = ${timeLeft.toFixed(2)}s`);
        if (Date.now() >= recListHideAt) {
            recListActive = false;
            dialogueBox.setVisible(false);
            dialogueText.setVisible(false);
            justAsked.orc = false;
            justAsked.wizard = false;
            justAsked.druid = false;
            setTimeout(() => {
                const canvas = document.querySelector('canvas');
                if (canvas) canvas.focus();
            }, 100);
        }
    }
}

function fetchCombinedSimilar(titles, scene) {
    const API_KEY = '4d0e8d9b0d1b3ff1f30606bd0dce8d30';
    function searchMovie(title) {
        return fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`)
            .then(r => r.json())
            .then(data => (data.results && data.results.length) ? data.results[0].id : null);
    }
    function getRecommendations(movieId) {
        return fetch(`https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${API_KEY}`)
            .then(r => r.json())
            .then(data => (data.results || []).map(m => m.title));
    }
    Promise.all(titles.map(title =>
        searchMovie(title)
            .then(movieId => movieId ? getRecommendations(movieId) : [])
            .catch(() => [])
    )).then(allRecs => {
        const allTitles = [].concat(...allRecs);
        const deduped = [...new Set(allTitles.filter(x => !titles.includes(x)))];
        let msg = 'Recommended for your party:\n' + deduped.slice(0, 16).join(' · ') +
                  '\n\n(Ask the adventuring party for new reccomnendations in 60 seconds...)';
        recListActive = true;
        recListHideAt = Date.now() + 60000; // 15 seconds from now!
        dialogueBox.setVisible(true);
        dialogueText.setText(msg).setVisible(true).setDepth(101);
        dialogueActive = true;
        npcSelections.orc = null;
        npcSelections.wizard = null;
        npcSelections.druid = null;
        justAsked.orc = true;
        justAsked.wizard = true;
        justAsked.druid = true;
    })
    .catch(err => {
        recListActive = true;
        recListHideAt = Date.now() + 60000;
        dialogueBox.setVisible(true);
        dialogueText.setText('Error fetching TMDB recommendations!\n(Retry in 60 seconds)').setVisible(true).setDepth(101);
        dialogueActive = true;
        justAsked.orc = true;
        justAsked.wizard = true;
        justAsked.druid = true;
    });
}

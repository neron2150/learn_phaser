import { Scene, Math as PhaserMath, Physics, GameObjects, Types } from "phaser";
import Carrot from "./Carrot.js";
export default class Game extends Scene {
  constructor() {
    super("game");
  }
  player?: Physics.Arcade.Sprite;
  platforms?: Physics.Arcade.StaticGroup;
  cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  carrots?: Phaser.Physics.Arcade.Group;
  carrotsCollected = 0;
  carrotsCollectedText?: GameObjects.Text;
  gameSpeed = 1;
  preload() {
    this.load.image("background", "assets/bg_layer1.png");
    this.load.image("platform", "assets/ground_grass.png");
    this.load.image("bunny-stand", "assets/bunny1_stand.png");
    this.load.image("carrot", "assets/carrot.png");
    this.load.image("bunny-jump", "assets/bunny1_jump.png");
    this.load.audio("jump", "assets/sfx/phaseJump1.ogg");
    this.load.audio("get-carrot", "assets/sfx/powerUp6.ogg");
    this.cursors = this.input.keyboard.createCursorKeys();
  }
  init() {
    this.carrotsCollected = 0;
    this.gameSpeed = 1;
  }
  create() {
    this.add.image(240, 320, "background").setScrollFactor(1, 0);

    this.platforms = this.physics.add.staticGroup();
    for (let i = 0; i < 5; ++i) {
      const x = PhaserMath.Between(80, 400);
      const y = 150 * i;
      const platform = this.platforms.create(x, y, "platform");
      platform.scale = 0.5;
      const body = platform.body as Physics.Arcade.Body;
      body.updateFromGameObject();
    }
    this.player = this.physics.add
      .sprite(240, 320, "bunny-stand")
      .setScale(0.5);
    this.player.body.checkCollision.up = false;
    this.player.body.checkCollision.left = false;
    this.player.body.checkCollision.right = false;
    this.physics.add.collider(this.platforms, this.player);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setDeadzone(this.scale.width * 1.5, 100);
    this.carrots = this.physics.add.group({
      classType: Carrot,
    });
    this.physics.add.collider(this.platforms, this.carrots);
    this.physics.add.overlap(
      this.player,
      this.carrots,
      undefined,
      this.handleCollectCarrot, // called on overlap
      this
    );
    const style = { color: "#FFF", fontSize: "25px" };
    this.carrotsCollectedText = this.add
      .text(240, 10, "Carrots: 0", style)
      .setScrollFactor(0)
      .setOrigin(0.5, 0);
  }
  update(t: number, dt: number): void {
    this.platforms?.children.iterate((child: GameObjects.GameObject) => {
      const platform = child as Physics.Arcade.Sprite;
      const scrollY = this.cameras.main.scrollY;
      if (platform.y >= scrollY + 700) {
        platform.y = scrollY - Phaser.Math.Between(50, 80);

        this.addCarrotAbove(platform);
        platform.body.updateFromGameObject();
      }
    });
    this.carrots?.children.iterate((child: GameObjects.GameObject) => {
      const carrot = child as Physics.Arcade.Sprite;
      const scrollY = this.cameras.main.scrollY;
      if (carrot.y >= scrollY + 700) {
        this.carrots?.killAndHide(carrot);
      }
    });
    const touchingDown = this.player?.body.touching.down;
    const currentVelocity = this.player?.body.velocity.x || 0;
    if (touchingDown) {
      this.gameSpeed += 5;
      this.player?.setVelocityY(
        -300 - this.gameSpeed - Math.abs(currentVelocity) / 10
      );

      console.log(`${this.player?.body.velocity.y}`);
      this.player?.setTexture("bunny-jump");
      this.sound.play("jump");
      this.physics.world.gravity.y = 200 + this.gameSpeed;
      console.log(this.physics.world.gravity.y);
    }
    const vy = this.player?.body.velocity.y ?? 0;
    if (vy > 0 && this.player?.texture.key !== "bunny-stand") {
      this.player?.setTexture("bunny-stand");
    }
    if (this.cursors?.left.isDown && !touchingDown) {
      this.player?.setVelocityX(-200);
    } else if (this.cursors?.right.isDown && !touchingDown) {
      this.player?.setVelocityX(200);
    } else {
      this.player?.setVelocityX(0);
      if (currentVelocity !== 0) {
        this.player?.setVelocityX(
          currentVelocity - (currentVelocity / 300) * dt
        );
      }
    }
    this.horizontalWrap(this.player);
    const bottomPlatform = this.findBottomMostPlatform();
    if (
      (this.player?.body.position.y ?? 0) >
      (bottomPlatform?.body.position.y ?? 0) + 900
    ) {
      this.scene.start("game-over");
    }
  }

  horizontalWrap(sprite?: GameObjects.Sprite) {
    const gameWidth = this.scale.width;
    const currentVelocity = sprite?.body.velocity.x || 0;
    if (sprite?.x && sprite.x < 0) {
      sprite.x = 0;
      this.player?.setVelocityX(Math.abs(currentVelocity));
    } else if (sprite?.x && sprite.x > gameWidth) {
      sprite.x = gameWidth;
      this.player?.setVelocityX(Math.abs(currentVelocity) * -1);
    }
  }
  addCarrotAbove(sprite: GameObjects.Sprite) {
    const y = sprite.y - sprite.displayHeight;
    const carrot = this?.carrots?.get(sprite.x, y, "carrot");
    carrot.setActive(true);
    carrot.setVisible(true);
    this.add.existing(carrot);
    // update the physics body size
    carrot.body.setSize(carrot.width, carrot.height);
    this.physics.world.enable(carrot);
    return carrot;
  }

  handleCollectCarrot(
    player: Types.Physics.Arcade.GameObjectWithBody,
    carrot: Types.Physics.Arcade.GameObjectWithBody
  ) {
    // hide from display
    this.carrots?.killAndHide(carrot);
    // disable from physics world
    this.physics.world.disableBody(carrot.body);
    this.carrotsCollected++;
    this.sound.play("get-carrot");
    this.carrotsCollectedText?.setText(`Carrots: ${this.carrotsCollected}`);
    return false;
  }
  findBottomMostPlatform() {
    const platforms = this.platforms?.getChildren() || [];
    let bottomPlatform = platforms[0];

    platforms?.forEach((platform) => {
      if (platform.body.position.y > bottomPlatform.body.position.y) {
        bottomPlatform = platform;
      }
    });

    return bottomPlatform;
  }
}

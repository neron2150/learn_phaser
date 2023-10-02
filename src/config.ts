import Phaser from "phaser";
import Game from "./scenes/Game";
import GameOver from "./scenes/GameOver";

export default {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: [Game, GameOver],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 200 },
      debug: false
    }
  }
};

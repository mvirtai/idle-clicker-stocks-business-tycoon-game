/**
 * Suorituskykyinen kiinteän koon rengaspuskuri (Circular / Ring Buffer)
 *
 * Senioriarkkitehdin opetus:
 * Kun reaaliaikaista hintatietoa päivitetään sekunneittain, tavallinen
 * `array.shift()` ja `array.push()` aiheuttaa jatkuvaa muistin siirtelyä ja
 * GC-painetta. Rengaspuskuri käyttää kiinteää muistiallokointia O(1)-operaatioilla.
 */
export class PriceHistoryBuffer {
  private buffer: Float64Array;
  private pointer: number = 0;
  private isFull: boolean = false;

  constructor(public readonly capacity: number = 60, initialValue: number = 0) {
    this.buffer = new Float64Array(capacity);
    if (initialValue > 0) {
      this.buffer.fill(initialValue);
      this.isFull = true;
    }
  }

  /**
   * Lisää uuden hinnan puskuriin O(1)-aikaisesti.
   */
  public push(price: number): void {
    this.buffer[this.pointer] = price;
    this.pointer = (this.pointer + 1) % this.capacity;
    if (this.pointer === 0) {
      this.isFull = true;
    }
  }

  /**
   * Palauttaa taulukon vanhimmasta uusimpaan hintaan kaavion piirtämistä varten.
   */
  public toArray(): number[] {
    const result: number[] = [];
    const count = this.isFull ? this.capacity : this.pointer;
    const start = this.isFull ? this.pointer : 0;

    for (let i = 0; i < count; i++) {
      const idx = (start + i) % this.capacity;
      result.push(Math.round(this.buffer[idx] * 100) / 100);
    }
    return result;
  }
}

// Binary min-heap over (priority, value) pairs; ties broken by insertion order (deterministic).
export class MinHeap {
  private p: number[] = [];
  private v: number[] = [];
  private s: number[] = [];
  private seq = 0;
  get size(): number {
    return this.v.length;
  }
  push(priority: number, value: number): void {
    this.p.push(priority);
    this.v.push(value);
    this.s.push(this.seq++);
    this.up(this.v.length - 1);
  }
  pop(): number | undefined {
    const n = this.v.length;
    if (!n) return undefined;
    const top = this.v[0];
    this.swap(0, n - 1);
    this.p.pop();
    this.v.pop();
    this.s.pop();
    this.down(0);
    return top;
  }
  private less(a: number, b: number): boolean {
    const pa = this.p[a]!,
      pb = this.p[b]!;
    return pa < pb || (pa === pb && this.s[a]! < this.s[b]!);
  }
  private swap(a: number, b: number): void {
    [this.p[a], this.p[b]] = [this.p[b]!, this.p[a]!];
    [this.v[a], this.v[b]] = [this.v[b]!, this.v[a]!];
    [this.s[a], this.s[b]] = [this.s[b]!, this.s[a]!];
  }
  private up(i: number): void {
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (!this.less(i, j)) return;
      this.swap(i, j);
      i = j;
    }
  }
  private down(i: number): void {
    for (;;) {
      const l = 2 * i + 1,
        r = l + 1;
      let m = i;
      if (l < this.v.length && this.less(l, m)) m = l;
      if (r < this.v.length && this.less(r, m)) m = r;
      if (m === i) return;
      this.swap(i, m);
      i = m;
    }
  }
}

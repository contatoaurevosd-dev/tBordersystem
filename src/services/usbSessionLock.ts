// src/services/usbSessionLock.ts
// Cadeado (mutex) para garantir que só 1 processo tente usar o USB por vez.

class UsbSessionLock {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(timeoutMs: number = 15000): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const giveLock = () => resolve();
      this.queue.push(giveLock);

      const timer = setTimeout(() => {
        const index = this.queue.indexOf(giveLock);
        if (index >= 0) {
          this.queue.splice(index, 1);
        }
        reject(new Error('Timeout esperando o cadeado USB'));
      }, timeoutMs);

      const originalResolve = giveLock;
      this.queue[this.queue.length - 1] = () => {
        clearTimeout(timer);
        originalResolve();
      };
    });
  }

  release() {
    if (!this.locked) return;

    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
      return;
    }

    this.locked = false;
  }

  isLocked() {
    return this.locked;
  }
}

export const usbSessionLock = new UsbSessionLock();

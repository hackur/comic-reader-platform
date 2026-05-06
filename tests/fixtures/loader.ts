import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url))

export async function loadFixture(relPath: string): Promise<Uint8Array> {
  const buf = await readFile(resolve(FIXTURES_DIR, relPath))
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

export function fixturePath(relPath: string): string {
  return resolve(FIXTURES_DIR, relPath)
}

export async function loadFixtureFile(
  relPath: string,
  name: string = relPath.split('/').pop() ?? 'fixture',
): Promise<File> {
  const bytes = await loadFixture(relPath)
  return new File([bytes], name)
}

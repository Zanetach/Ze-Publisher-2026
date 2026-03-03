const LEGACY_PREFIX = "zepublish-";
const CURRENT_PREFIX = "zepublish-";
const MIGRATION_MARKER = "zepublish-storage-migrated-v1";

export function migrateLegacyStorageKeys(): void {
	if (typeof window === "undefined" || !window.localStorage) {
		return;
	}

	try {
		if (localStorage.getItem(MIGRATION_MARKER) === "1") {
			return;
		}

		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key) {
				keys.push(key);
			}
		}

		for (const key of keys) {
			if (!key.startsWith(LEGACY_PREFIX)) {
				continue;
			}

			const nextKey = `${CURRENT_PREFIX}${key.slice(LEGACY_PREFIX.length)}`;
			if (localStorage.getItem(nextKey) !== null) {
				continue;
			}

			const value = localStorage.getItem(key);
			if (value !== null) {
				localStorage.setItem(nextKey, value);
			}
		}

		localStorage.setItem(MIGRATION_MARKER, "1");
	} catch (error) {
		console.warn("[Ze-Publisher] Failed to migrate legacy localStorage keys:", error);
	}
}

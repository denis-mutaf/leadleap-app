import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MetaAccountStore {
  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void
}

export const useMetaAccountStore = create<MetaAccountStore>()(
  persist(
    (set) => ({
      selectedAccountId: null,
      setSelectedAccountId: (id) => set({ selectedAccountId: id }),
    }),
    { name: 'meta-account-store' }
  )
)

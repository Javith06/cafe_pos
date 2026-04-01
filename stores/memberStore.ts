import { create } from 'zustand';
import { API_URL } from '../constants/Config';

export type Member = {
  MemberId: number;
  Name: string;
  Phone: string;
  Balance: number;
};

type MemberState = {
  members: Member[];
  loading: boolean;
  fetchMembers: () => Promise<void>;
  addMember: (name: string, phone: string) => Promise<boolean>;
};

export const useMemberStore = create<MemberState>((set) => ({
  members: [],
  loading: false,

  fetchMembers: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/members`);
      const data = await res.json();
      set({ members: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      console.error('Fetch members failed:', err);
      set({ loading: false });
    }
  },

  addMember: async (name, phone) => {
    try {
      const res = await fetch(`${API_URL}/api/members/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        const store = useMemberStore.getState();
        await store.fetchMembers();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Add member failed:', err);
      return false;
    }
  },
}));

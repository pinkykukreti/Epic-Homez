import { createContext, useContext, useEffect, useState } from "react";
import { categories, defaults, supabase } from "./api";
import { publicCategories } from "./collections";
const Context = createContext(null);
export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(defaults),
    [groups, setGroups] = useState(categories);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    async function load() {
      const [s, c] = await Promise.all([
        supabase.from("site_settings").select("data").eq("id", true).single(),
        supabase.from("categories").select("*").order("position"),
      ]);
      if (alive) {
        if (s.data) setSettings({ ...defaults, ...s.data.data });
        if (c.data) setGroups(c.data);
      }
    }
    load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return (
    <Context.Provider value={{ settings, setSettings, categories: publicCategories(groups) }}>
      {children}
    </Context.Provider>
  );
}
export const useSite = () => useContext(Context);

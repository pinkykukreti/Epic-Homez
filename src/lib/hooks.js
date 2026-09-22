import { useEffect, useState } from "react";
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: "" }),
    [version, reload] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (alive) setState({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (alive)
          setState({
            loading: false,
            data: null,
            error: e.message || "Something went wrong.",
          });
      });
    return () => {
      alive = false;
    };
  }, [...deps, version]);
  return { ...state, reload: () => reload((v) => v + 1) };
}
export function useDebounce(value, delay = 300) {
  const [v, set] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => set(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

-- ReDesign2: grants the per-user screens need, found by the @supabase journeys.
-- Additive only: one column grant and two functions. Today's app is unaffected.

-- Putting a kept poem in a list updates saved_poems.list_ids. The row policy
-- ("Users can update own saved poems") exists; the column privilege did not.
GRANT UPDATE (list_ids) ON public.saved_poems TO authenticated;

-- Follows are keyed by poet id, but the app only knows slugs, and the catalogue
-- (poets included) stays off the Data API: it is served by Express. These two
-- functions resolve slugs for the signed-in reader without granting poets.
CREATE OR REPLACE FUNCTION public.set_follow(p_slug text, p_on boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_poet integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_poet FROM public.poets WHERE slug = p_slug;
  IF v_poet IS NULL THEN
    RAISE EXCEPTION 'no poet %', p_slug USING ERRCODE = 'P0002';
  END IF;
  IF p_on THEN
    INSERT INTO public.poet_follows (user_id, poet_id) VALUES (auth.uid(), v_poet) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.poet_follows WHERE user_id = auth.uid() AND poet_id = v_poet;
  END IF;
END;
$$;

-- Newest follow first.
CREATE OR REPLACE FUNCTION public.followed_poet_slugs() RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.slug FROM public.poet_follows f JOIN public.poets p ON p.id = f.poet_id
  WHERE f.user_id = auth.uid() ORDER BY f.followed_at DESC;
$$;

REVOKE ALL ON FUNCTION public.set_follow(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.followed_poet_slugs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_follow(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.followed_poet_slugs() TO authenticated;

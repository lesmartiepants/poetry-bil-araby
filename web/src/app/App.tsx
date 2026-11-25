// The app shell: routes, providers, overlays and reading prefs on the page.
import { useEffect, useState } from 'react';
import { Redirect, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { usePrefs } from '@core/hooks';
import { isAvailable, type Domain } from '@core/sources';
import { readJSON, writeJSON } from '@core/storage';
import { Coming, Toast } from '@ds/primitives';
import { useOverlay } from '@components/overlays';
import { TabBar } from './TabBar';
import { DevPanel } from '../features/shell/DevPanel';
import { Splash } from '../features/shell/Splash';
import { AppearanceControls, ReaderScreen } from '../features/reader/ReaderScreen';
import { Player, useDefaultVoice } from '../features/listening/Player';
import { AllPoets, EraShelves, ExploreHub, FeelingShelves, OneShelf } from '../features/explore/Explore';
import { PoetScreen } from '../features/poet/PoetScreen';
import { KeepFlow, KeepListsSheet, ListIcon, NewListSheet, SignInSheet } from '../features/keep/Keep';
import { ShareScreen } from '../features/share/Share';
import { AllLists, FollowedPoets, LibraryHub, ListScreen } from '../features/library/Library';
import { FinishedScreen, JourneyScreen, StepDone, TonightScreen, WelcomeFlow } from '../features/journey/Journey';
import { AllCollections, CollectionScreen } from '../features/collections/Collections';
import { SearchScreen } from '../features/search/Search';
import { AppearanceScreen, GuideScreen, MovesScreen, ReciterScreen, TranslationScreen, YouHub } from '../features/you/You';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1, retryDelay: 500 } } });
const FONT_VAR = { amiri: 'var(--font-amiri)', naskh: 'var(--font-naskh)', scheherazade: 'var(--font-scheherazade)' };

function PrefsOnPage() {
  const p = usePrefs().data;
  useEffect(() => {
    if (!p) return;
    const root = document.documentElement;
    root.dataset.page = p.page;
    root.style.setProperty('--reading-font', FONT_VAR[p.font]);
    root.style.setProperty('--reading-size', `var(--verse-${p.textSize})`);
  }, [p]);
  return null;
}

function Overlays() {
  const { overlay, toast } = useOverlay();
  return (
    <>
      {overlay?.type === 'keep' && <KeepFlow poemId={overlay.poemId} />}
      {overlay?.type === 'keep-lists' && <KeepListsSheet poemId={overlay.poemId} />}
      {overlay?.type === 'share' && <ShareScreen poemId={overlay.poemId} />}
      {overlay?.type === 'signin' && <SignInSheet then={overlay.then} />}
      {toast && (
        <Toast action={toast.action} alert={toast.alert} mark={toast.mark}
          onAction={() => { toast.onAction?.(); useOverlay.getState().showToast(null); }}
          undo={toast.undo && (() => { toast.undo?.(); useOverlay.getState().showToast(null); })}>
          {toast.text}
        </Toast>
      )}
    </>
  );
}

/** Production hides screens whose data is still mocked (the spec's "coming" states). */
function Gate({ domains, children, title }: { domains: Domain[]; children: React.ReactNode; title: string }) {
  const [, nav] = useLocation();
  if (isAvailable(...domains)) return <>{children}</>;
  return <div className="screen"><Coming title={title} body="This part of the app is on its way." action={<button className="btn" onClick={() => nav('/explore')}>Explore poems</button>} /></div>;
}

function Home() {
  const welcomed = readJSON('welcomed', false);
  if (!isAvailable('journey')) return <Redirect to="/explore" />;
  return <Redirect to={welcomed ? '/journey' : '/welcome'} />;
}

function Routes() {
  const voice = useDefaultVoice();
  const [, nav] = useLocation();
  const [loc] = useLocation();
  const hideTabs = loc.startsWith('/p/') || loc === '/welcome';
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/welcome">{() => <Gate domains={['journey']} title="Welcome"><WelcomeFlow onDone={() => { writeJSON('welcomed', true); nav('/journey?welcome=1', { replace: true }); }} /></Gate>}</Route>
        <Route path="/journey">{() => <Gate domains={['journey']} title="Tonight’s poem"><TonightScreen /></Gate>}</Route>
        <Route path="/journey/finished/:id">{(p) => <Gate domains={['journey', 'ai']} title="Tonight’s poem"><FinishedScreen id={p.id} /></Gate>}</Route>
        <Route path="/journey/:slug/done/:step">{(p) => <Gate domains={['journey', 'collections']} title="Journeys"><StepDone slug={p.slug} step={Number(p.step)} /></Gate>}</Route>
        <Route path="/journey/:slug">{(p) => <Gate domains={['journey', 'collections']} title="Journeys"><JourneyScreen slug={p.slug} /></Gate>}</Route>
        <Route path="/p/:id">{(p) => <Gate domains={['poems']} title="The reader"><ReaderScreen key={p.id} id={p.id} Player={Player} defaultVoice={voice} /></Gate>}</Route>
        <Route path="/explore">{() => <Gate domains={['explore', 'poets']} title="Explore"><ExploreHub /></Gate>}</Route>
        <Route path="/explore/poets">{() => <Gate domains={['poets']} title="All poets"><AllPoets /></Gate>}</Route>
        <Route path="/explore/feelings">{() => <Gate domains={['explore']} title="Feelings"><FeelingShelves /></Gate>}</Route>
        <Route path="/explore/eras">{() => <Gate domains={['explore']} title="Eras"><EraShelves /></Gate>}</Route>
        <Route path="/explore/collections">{() => <Gate domains={['collections']} title="Collections"><AllCollections /></Gate>}</Route>
        <Route path="/explore/:kind/:key">{(p) => <Gate domains={['explore', 'poems']} title="Explore"><OneShelf kind={p.kind as 'feeling' | 'era' | 'difficulty'} keyName={p.key} /></Gate>}</Route>
        <Route path="/poet/:slug">{(p) => <Gate domains={['poets']} title="Poets"><PoetScreen slug={p.slug} tab="poems" /></Gate>}</Route>
        <Route path="/poet/:slug/about">{(p) => <Gate domains={['poets']} title="Poets"><PoetScreen slug={p.slug} tab="about" /></Gate>}</Route>
        <Route path="/collection/:slug">{(p) => <Gate domains={['collections']} title="Collections"><CollectionScreen slug={p.slug} /></Gate>}</Route>
        <Route path="/library">{() => <Gate domains={['keeps', 'lists', 'library']} title="Your diwan"><LibraryHub ListIcon={ListIcon} /></Gate>}</Route>
        <Route path="/library/lists">{() => <Gate domains={['lists']} title="Your lists"><AllLists ListIcon={ListIcon} ListEditor={NewListSheet} /></Gate>}</Route>
        <Route path="/library/list/:id">{(p) => <Gate domains={['lists']} title="Your lists"><ListScreen id={p.id} ListIcon={ListIcon} /></Gate>}</Route>
        <Route path="/library/poets">{() => <Gate domains={['library']} title="Poets you follow"><FollowedPoets /></Gate>}</Route>
        <Route path="/search">{() => <Gate domains={['search']} title="Search"><SearchScreen /></Gate>}</Route>
        <Route path="/you">{() => <YouHub />}</Route>
        <Route path="/you/appearance">{() => <AppearanceScreen Controls={AppearanceControls} />}</Route>
        <Route path="/you/moves">{() => <Gate domains={['journey']} title="What moves you"><MovesScreen /></Gate>}</Route>
        <Route path="/you/guide">{() => <Gate domains={['journey']} title="The guide"><GuideScreen /></Gate>}</Route>
        <Route path="/you/reciter">{() => <ReciterScreen />}</Route>
        <Route path="/you/translation">{() => <TranslationScreen />}</Route>
        <Route><div className="screen"><Coming title="Nothing here" body="This page doesn’t exist." action={<button className="btn" onClick={() => nav('/explore')}>Explore poems</button>} /></div></Route>
      </Switch>
      {!hideTabs && <TabBar />}
    </>
  );
}

/** When the signed-in user changes, every per-user query refetches. */
function AuthSync({ supabase }: { supabase: SupabaseClient | null }) {
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => { queryClient.invalidateQueries(); });
    return () => data.subscription.unsubscribe();
  }, [supabase]);
  return null;
}

export function App({ supabase = null }: { supabase?: SupabaseClient | null }) {
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('splashed'));
  useEffect(() => {
    if (!splash) return;
    const t = setTimeout(() => { sessionStorage.setItem('splashed', '1'); setSplash(false); }, 900);
    return () => clearTimeout(t);
  }, [splash]);
  const hash = import.meta.env.VITE_HASH_ROUTER === '1';
  return (
    <QueryClientProvider client={queryClient}>
      <PrefsOnPage />
      <AuthSync supabase={supabase} />
      <Router base={hash ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')} hook={hash ? useHashLocation : undefined}>
        <div className="app-frame">
          <Routes />
          <Overlays />
          <DevPanel />
        </div>
      </Router>
      {splash && <Splash />}
    </QueryClientProvider>
  );
}

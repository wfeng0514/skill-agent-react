import Navigation from './components/Navigation';
import Hero from './components/Hero';
import SkillSection from './components/SkillSection';
import AgentSection from './components/AgentSection';
import RelationSection from './components/RelationSection';
import PlaygroundSection from './components/PlaygroundSection';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="app">
      <Navigation />
      <main>
        <Hero />
        <SkillSection />
        <AgentSection />
        <RelationSection />
        <PlaygroundSection />
      </main>
      <Footer />
    </div>
  );
};

export default App;

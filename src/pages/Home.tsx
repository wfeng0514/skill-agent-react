import Hero from '../components/Hero';
import SkillSection from '../components/SkillSection';
import AgentSection from '../components/AgentSection';
import RelationSection from '../components/RelationSection';
import PlaygroundSection from '../components/PlaygroundSection';
import Footer from '../components/Footer';

const Home: React.FC = () => {
  return (
    <div className="app">
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

export default Home;

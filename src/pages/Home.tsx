import Hero from '../components/Hero';
import SkillSection from '../components/SkillSection';
import AgentSection from '../components/AgentSection';
import RelationSection from '../components/RelationSection';
import PlaygroundSection from '../components/PlaygroundSection';
import Footer from '../components/Footer';

import styles from './Home.module.scss';

const Home: React.FC = () => {
  return (
    <div className={styles.home}>
      <main className={styles.main}>
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

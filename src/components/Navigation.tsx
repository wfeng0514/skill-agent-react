import { memo, useState, useEffect } from 'react';
import type { NavItem } from '../utils/constants';
import { navItems } from '../utils/constants';
import { throttle } from '../utils/helpers';
import styles from './Navigation.module.scss';

const Navigation: React.FC = () => {
  const [active, setActive] = useState('skill');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = throttle(() => {
      const sections = ['skill', 'agent', 'relation', 'playground'];
      let current = 'skill';

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 150) {
          current = id;
        }
      }
      setActive(current);
      setVisible(window.scrollY > 300);
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${visible ? styles.visible : ''}`}>
      <div className={styles.inner}>
        <span className={styles.logo}>🐾 SkillAgent</span>
        <div className={styles.links}>
          {navItems.map((item: NavItem) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`${styles.link} ${active === item.id ? styles.active : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default memo(Navigation);

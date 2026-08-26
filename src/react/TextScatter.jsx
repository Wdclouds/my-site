// TextScatter —— 字母散射效果（悬停四散 + 弹性回弹），依赖 gsap
// 源码来自 reactbits-starter/text-scatter
import React from 'react';
import { gsap } from 'gsap';
import './text-scatter.css';

const TextScatter = ({
  text = 'Bounce Back.',
  className = '',
  as: Tag = 'h1',
  velocity = 200,
  rotation = 90,
  scale = 1,
  returnAfter = 1,
  duration = 2,
}) => {
  const handleMouseEnter = (e) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const dx = centerX - mouseX;
    const dy = centerY - mouseY;
    const angle = Math.atan2(dy, dx);
    const randomFactor = 0.8 + Math.random() * 0.4;
    const force = velocity * randomFactor;
    const moveX = Math.cos(angle) * force;
    const moveY = Math.sin(angle) * force;
    const rotate = (Math.random() - 0.5) * rotation * 2;
    gsap.to(target, {
      x: moveX,
      y: moveY,
      rotation: rotate,
      scale: scale,
      duration: duration,
      ease: 'power4.out',
      overwrite: 'auto',
      onComplete: () => {
        gsap.to(target, {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: duration,
          delay: returnAfter,
          ease: 'elastic.out(1, 0.3)',
          overwrite: 'auto',
        });
      },
    });
  };

  return (
    <Tag className={'text-scatter ' + className}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className='text-scatter__letter'
          onMouseEnter={handleMouseEnter}
          style={{ willChange: 'transform' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </Tag>
  );
};

export default TextScatter;
/**
 * 示例 React 组件 —— 演示 react bits 组件如何接入 Vue
 * 实际使用时：从 reactbits.dev 下载你喜欢的组件放到 src/react/ 目录，
 * 替换本文件即可（保持导出方式一致）
 */
export default function SampleWidget({ text = 'React 组件示例' }) {
  return (
    <div
      style={{
        padding: '1rem',
        border: '1px dashed #999',
        borderRadius: '8px',
        display: 'inline-block',
      }}
    >
      {text}
    </div>
  )
}

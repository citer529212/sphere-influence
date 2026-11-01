import { Component, ReactNode } from 'react';
export class AssetBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError():{failed:boolean}{return {failed:true};}
  componentDidCatch(error:Error):void{console.error('[Assets] Не удалось открыть экран',error);}
  render():ReactNode{return this.state.failed?this.props.fallback:this.props.children;}
}

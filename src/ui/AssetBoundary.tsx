import { Component, ReactNode } from 'react';
export class AssetBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError():{failed:boolean}{return {failed:true};}
  render():ReactNode{return this.state.failed?this.props.fallback:this.props.children;}
}

import { Node } from 'xmldom';

export class XmlUtilities {
  public static findChildElement(node: Node, name: string): Node {
    let child = node.firstChild;
    while (child) {
      if (child.nodeName === name) {
        return child;
      }

      child = child.nextSibling;
    }

    return undefined;
  }

  public static getAttributeValue(node: Node, name: string): string {
    const attribute = node.attributes.getNamedItem(name);
    return attribute ? attribute.nodeValue : undefined;
  }

  public static getTextContentForTag(parentNode: Node, tagName: string): string {
    const node = parentNode.getElementsByTagName(tagName);
    return node.length > 0 ? node[0].textContent : '';
  }
}

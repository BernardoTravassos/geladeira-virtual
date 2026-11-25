package expo.modules.widgetagua

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Lê o estado que o widget guarda sozinho (o expo-widgets não expõe isso para o JS).
 * É o mesmo arquivo e a mesma chave que o expo-widgets usa para as props de cada widget.
 */
class WidgetAguaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetAgua")

    AsyncFunction("lerProps") { nome: String ->
      val context = appContext.reactContext ?: return@AsyncFunction null
      context.applicationContext
        .getSharedPreferences("expo.modules.widgets", android.content.Context.MODE_PRIVATE)
        .getString("__expo_widgets_${nome}_props", null)
    }
  }
}
